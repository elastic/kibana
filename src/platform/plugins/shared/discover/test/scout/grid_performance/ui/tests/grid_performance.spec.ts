/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Grid-implementation-agnostic Discover data grid benchmark. Runs the same scenarios against
 * whichever grid the server's feature flags select and writes medians to
 * `target/discover_grid_performance/<implementation>.json`.
 *
 * Opt-in only: `DISCOVER_GRID_PERF=true` (runs: `DISCOVER_GRID_PERF_RUNS`, default 3;
 * CPU slowdown: `DISCOVER_GRID_PERF_CPU_THROTTLE`, default 1; a screenshot per scenario:
 * `DISCOVER_GRID_PERF_SCREENSHOTS=true`).
 */

import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { SAMPLE_SIZE_SETTING } from '@kbn/discover-utils';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../../common/ui/fixtures';
import {
  GRID_PERF_DOC_COUNT,
  GRID_PERF_FIELDS,
  GRID_PERF_INDEX,
  GRID_PERF_LOGS_INDEX,
  GRID_PERF_OBLT_SPACE,
  buildDiscoverHash,
  collectLoadMetrics,
  ensureGridPerfIndex,
  installGridRenderProbe,
  measureRowSelection,
  measureScroll,
  medianOf,
} from '../fixtures/grid_performance';

const ENABLED = process.env.DISCOVER_GRID_PERF === 'true';
const RUNS = Number(process.env.DISCOVER_GRID_PERF_RUNS ?? 3);
const CPU_THROTTLE = Number(process.env.DISCOVER_GRID_PERF_CPU_THROTTLE ?? 1);
const SCREENSHOTS = process.env.DISCOVER_GRID_PERF_SCREENSHOTS === 'true';
const OUTPUT_DIR = resolve(REPO_ROOT, 'target', 'discover_grid_performance');

interface Scenario {
  readonly name: string;
  readonly logs: boolean;
  readonly columnCount: number;
  readonly sampleSize: number;
  readonly rowsPerPage: number;
}

const SCENARIOS: readonly Scenario[] = [
  {
    name: 'paged 500 rows, summary column',
    logs: false,
    columnCount: 0,
    sampleSize: 500,
    rowsPerPage: 500,
  },
  {
    name: 'paged 500 rows, 10 columns',
    logs: false,
    columnCount: 10,
    sampleSize: 500,
    rowsPerPage: 500,
  },
  {
    name: 'paged 500 rows, 50 columns',
    logs: false,
    columnCount: 50,
    sampleSize: 500,
    rowsPerPage: 500,
  },
  {
    name: 'paged 500 rows, 100 columns',
    logs: false,
    columnCount: 100,
    sampleSize: 500,
    rowsPerPage: 500,
  },
  {
    name: 'logs single page 10000 rows, summary column',
    logs: true,
    columnCount: 0,
    sampleSize: 10_000,
    rowsPerPage: 100,
  },
  {
    name: 'logs single page 10000 rows, 50 columns',
    logs: true,
    columnCount: 50,
    sampleSize: 10_000,
    rowsPerPage: 100,
  },
];

const results: Record<string, unknown> = {};
let implementation = 'unknown';

test.describe(
  'Discover grid performance',
  { tag: [...tags.stateful.classic, ...tags.performance] },
  () => {
    test.skip(!ENABLED, 'Opt-in benchmark: set DISCOVER_GRID_PERF=true');
    test.use({ viewport: { width: 1920, height: 1080 } });

    const dataViewIds = { default: '', logs: '' };

    test.beforeAll(async ({ apiServices, esClient, kbnClient }) => {
      await ensureGridPerfIndex(esClient, GRID_PERF_INDEX);
      await ensureGridPerfIndex(esClient, GRID_PERF_LOGS_INDEX);

      await apiServices.spaces.delete(GRID_PERF_OBLT_SPACE).catch(() => {});
      await apiServices.spaces.create({
        id: GRID_PERF_OBLT_SPACE,
        name: 'Grid performance (Observability)',
        disabledFeatures: [],
      });
      await apiServices.spaces.setSolutionView({ id: GRID_PERF_OBLT_SPACE, solution: 'oblt' });

      const { data: defaultDataView } = await apiServices.dataViews.create({
        title: GRID_PERF_INDEX,
        timeFieldName: '@timestamp',
        override: true,
      });
      const { data: logsDataView } = await apiServices.dataViews.create({
        title: GRID_PERF_LOGS_INDEX,
        timeFieldName: '@timestamp',
        override: true,
        spaceId: GRID_PERF_OBLT_SPACE,
      });
      dataViewIds.default = defaultDataView.id;
      dataViewIds.logs = logsDataView.id;

      // The URL `sampleSize` is capped by this per-space setting (default 500).
      await kbnClient.uiSettings.update({ [SAMPLE_SIZE_SETTING]: GRID_PERF_DOC_COUNT });
      await kbnClient.uiSettings.update(
        { [SAMPLE_SIZE_SETTING]: GRID_PERF_DOC_COUNT },
        { space: GRID_PERF_OBLT_SPACE }
      );
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ apiServices, kbnClient }) => {
      await kbnClient.uiSettings.unset(SAMPLE_SIZE_SETTING);
      await apiServices.dataViews.deleteByTitle(GRID_PERF_INDEX).catch(() => {});
      await apiServices.spaces.delete(GRID_PERF_OBLT_SPACE).catch(() => {});
      if (!ENABLED) return;
      mkdirSync(OUTPUT_DIR, { recursive: true });
      writeFileSync(
        resolve(OUTPUT_DIR, `${implementation}.json`),
        JSON.stringify(
          { implementation, runs: RUNS, cpuThrottle: CPU_THROTTLE, scenarios: results },
          null,
          2
        )
      );
    });

    for (const scenario of SCENARIOS) {
      test(scenario.name, async ({ page, context, kbnUrl, pageObjects, perfTracker, log }) => {
        test.setTimeout(RUNS * 120_000);
        const { dataGrid } = pageObjects;
        const columns = GRID_PERF_FIELDS.slice(0, scenario.columnCount);
        const hash = buildDiscoverHash({
          dataViewId: scenario.logs ? dataViewIds.logs : dataViewIds.default,
          columns,
          sampleSize: scenario.sampleSize,
          rowsPerPage: scenario.rowsPerPage,
        });
        const url = kbnUrl.app('discover', {
          space: scenario.logs ? GRID_PERF_OBLT_SPACE : undefined,
          pathOptions: { hash },
        });

        await installGridRenderProbe(page);
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });

        const runs = [];
        for (let run = 0; run < RUNS; run++) {
          await page.goto(url);
          await dataGrid.waitForDocTableRendered();
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  (window as unknown as { gridPerfProbe: { renderedAt: number } }).gridPerfProbe
                    .renderedAt
              )
            )
            .toBeGreaterThan(0);
          const isRdg =
            (await page.testSubj
              .locator('discoverDocTable')
              .getAttribute('data-grid-implementation')) === 'rdg';
          implementation = isRdg
            ? 'rdg'
            : (await dataGrid.isEuiDataGrid())
            ? 'unified'
            : 'tanstack';

          const load = await collectLoadMetrics(page);
          if (SCREENSHOTS && run === 0) {
            await page.screenshot({
              path: resolve(
                OUTPUT_DIR,
                `${implementation}-${scenario.name.replace(/[^a-z0-9]+/gi, '_')}.png`
              ),
            });
          }
          const selection = await measureRowSelection(page);

          const beforeScroll = await perfTracker.capturePagePerformanceMetrics(cdp);
          const verticalScroll = await measureScroll(page, {
            axis: 'y',
            durationMs: 3_000,
            stepPx: 120,
          });
          const afterScroll = await perfTracker.capturePagePerformanceMetrics(cdp);
          const horizontalScroll =
            scenario.columnCount >= 10
              ? await measureScroll(page, { axis: 'x', durationMs: 2_000, stepPx: 80 })
              : null;

          await cdp.send('HeapProfiler.collectGarbage');
          const afterGc = await perfTracker.capturePagePerformanceMetrics(cdp);

          runs.push({
            load,
            selection: selection ?? { commitMs: -1, nextFrameMs: -1 },
            verticalScroll: {
              ...verticalScroll,
              scriptMs: Math.round(
                ((afterScroll.scriptTime ?? 0) - (beforeScroll.scriptTime ?? 0)) * 1000
              ),
              layoutMs: Math.round(
                ((afterScroll.layoutTime ?? 0) - (beforeScroll.layoutTime ?? 0)) * 1000
              ),
              styleRecalcs:
                (afterScroll.styleRecalcCount ?? 0) - (beforeScroll.styleRecalcCount ?? 0),
            },
            horizontalScroll: horizontalScroll ?? { scrollerFound: false },
            heapMb: Math.round(((afterGc.jsHeapUsedSize ?? 0) / 1024 / 1024) * 10) / 10,
            documentNodes: afterGc.nodesCount ?? 0,
          });
        }

        const median = medianOf(runs);
        results[scenario.name] = median;
        log.info(`[grid-perf] ${implementation} | ${scenario.name}: ${JSON.stringify(median)}`);
        expect(median.load.renderedRowCount).toBeGreaterThan(0);
      });
    }
  }
);
