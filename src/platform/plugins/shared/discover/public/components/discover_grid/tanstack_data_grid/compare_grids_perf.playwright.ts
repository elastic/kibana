/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A/B CDP performance comparison: TanStack DataGrid (default) vs UnifiedDataTable.
 *
 * Usage (Kibana must be running):
 *   npx playwright test --config=src/platform/plugins/shared/discover/public/components/discover_grid/tanstack_data_grid/playwright.config.ts \
 *     src/platform/plugins/shared/discover/public/components/discover_grid/tanstack_data_grid/compare_grids_perf.playwright.ts
 *
 * Writes JSON results next to this file for the markdown report.
 */

/* eslint-disable no-console, import/no-extraneous-dependencies */

import path from 'path';
import { test, expect, type CDPSession, type Page } from '@playwright/test';
import { writeFileSync } from '@kbn/fs';

const KIBANA_URL = process.env.KIBANA_URL ?? 'http://localhost:5601';

/** Same synthetic dataset for both grids; implementation is selected via the density popover switch. */
const ROW_BASE = 'ROW a=1,b="hello",c=3.14,d="x",e="y",f=42,g="more",h="data" // 200x';

interface PerfSnapshot {
  timestamp: number;
  nodesCount?: number;
  jsHeapUsedSize?: number;
  jsHeapTotalSize?: number;
  layoutCount?: number;
  styleRecalcCount?: number;
  scriptDuration?: number;
  layoutDuration?: number;
  taskDuration?: number;
}

interface DomStats {
  totalNodes: number;
  rowCount: number;
  cellCount: number;
}

interface GridRunResult {
  grid: 'TanStackDataGrid' | 'UnifiedDataTable';
  query: string;
  renderMs: number;
  afterRender: PerfSnapshot;
  scroll: {
    nodesDelta: number;
    layoutDelta: number;
    styleDelta: number;
    heapDeltaBytes: number;
    durationMs: number;
  };
  domInitial: DomStats;
  domAfterScroll: DomStats;
  longTasksRapidScroll: number;
  heapUsedMb: number;
}

const captureCDPMetrics = async (cdp: CDPSession): Promise<PerfSnapshot> => {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const get = (name: string) => metrics.find((m) => m.name === name)?.value;
  return {
    timestamp: Date.now(),
    nodesCount: get('Nodes'),
    jsHeapUsedSize: get('JSHeapUsedSize'),
    jsHeapTotalSize: get('JSHeapTotalSize'),
    layoutCount: get('LayoutCount'),
    styleRecalcCount: get('RecalcStyleCount'),
    scriptDuration: get('ScriptDuration'),
    layoutDuration: get('LayoutDuration'),
    taskDuration: get('TaskDuration'),
  };
};

const login = async (page: Page) => {
  await page.goto(`${KIBANA_URL}/app/discover`, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  const discoverHeading = page.getByRole('heading', { name: /Discover/i }).first();
  const loginBtn = page.getByRole('button', { name: 'Log in' });

  // Wait for either authenticated Discover or the snapshot login button
  await Promise.race([
    discoverHeading.waitFor({ state: 'visible', timeout: 60_000 }),
    loginBtn.waitFor({ state: 'visible', timeout: 60_000 }),
  ]);

  if (await discoverHeading.isVisible().catch(() => false)) {
    return;
  }

  await loginBtn.click();
  await discoverHeading.waitFor({ state: 'visible', timeout: 90_000 });
};

const setupDiscover = async (page: Page) => {
  await login(page);
  if (!page.url().includes('/app/discover')) {
    await page.goto(`${KIBANA_URL}/app/discover`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
  }

  const closeBtn = page.getByRole('button', { name: 'Close' });
  if (await closeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await closeBtn.click();
  }

  // Ensure ES|QL mode
  const esqlBtn = page.getByRole('button', { name: 'ES|QL' });
  if (await esqlBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await esqlBtn.click();
    await page.waitForTimeout(2000);
  } else {
    const tryEsql = page.getByText('Try ES|QL');
    if (await tryEsql.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await tryEsql.click();
      await page.waitForTimeout(2000);
    }
  }

  await page.locator('.monaco-editor').first().waitFor({ timeout: 60_000 });
};

const submitEsqlQuery = async (page: Page, query: string) => {
  const monacoLines = page.locator('.monaco-editor .view-lines');
  await monacoLines.first().waitFor({ timeout: 30_000 });
  await monacoLines.first().click({ force: true });
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(query, { delay: 5 });
  const submitBtn = page
    .locator('[data-test-subj="querySubmitButton"]')
    .or(page.getByRole('button', { name: 'Search' }));
  await submitBtn.first().click();
  await page.waitForTimeout(5000);
};

const switchGridViaUi = async (page: Page) => {
  const densityBtn = page.locator('[data-test-subj="dataGridDensityButton"]');
  await expect(densityBtn).toBeVisible({ timeout: 10_000 });
  await densityBtn.click();
  await page.getByTestId('discoverGridImplementationSwitch').click();
  await densityBtn.click();
  await page.waitForTimeout(1000);
};

const readDomStats = async (page: Page): Promise<DomStats> =>
  page.evaluate(() => {
    const grid = document.querySelector('[role="grid"]');
    if (!grid) return { totalNodes: 0, rowCount: 0, cellCount: 0 };
    return {
      totalNodes: grid.querySelectorAll('*').length,
      rowCount: grid.querySelectorAll('[role="row"]').length,
      cellCount: grid.querySelectorAll('[role="gridcell"], [role="columnheader"]').length,
    };
  });

const measureGrid = async (
  page: Page,
  grid: GridRunResult['grid'],
  query: string,
  { submitQuery = true }: { submitQuery?: boolean } = {}
): Promise<GridRunResult> => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  // Force GC when available for more stable heap reads
  await cdp.send('HeapProfiler.enable').catch(() => undefined);
  await cdp.send('HeapProfiler.collectGarbage').catch(() => undefined);

  const t0 = Date.now();
  if (submitQuery) {
    await submitEsqlQuery(page, query);
  }

  if (grid === 'TanStackDataGrid') {
    await expect(page.getByTestId('tanstackGridWrapper')).toBeVisible({ timeout: 60_000 });
  } else {
    await expect(page.getByTestId('tanstackGridWrapper')).toHaveCount(0, { timeout: 30_000 });
    await expect(page.locator('[role="grid"]').first()).toBeVisible({ timeout: 60_000 });
  }

  const renderMs = Date.now() - t0;
  const afterRender = await captureCDPMetrics(cdp);
  const domInitial = await readDomStats(page);

  const beforeScroll = await captureCDPMetrics(cdp);
  const scrollStart = Date.now();
  const scrollContainer = page.locator('[role="grid"]').first();
  await scrollContainer.evaluate((el) => {
    el.scrollTo({ top: el.scrollHeight / 2, behavior: 'instant' as ScrollBehavior });
  });
  await page.waitForTimeout(400);
  await scrollContainer.evaluate((el) => {
    el.scrollTo({ top: el.scrollHeight, behavior: 'instant' as ScrollBehavior });
  });
  await page.waitForTimeout(400);
  await scrollContainer.evaluate((el) => {
    el.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  });
  await page.waitForTimeout(400);
  const afterScroll = await captureCDPMetrics(cdp);
  const scrollDurationMs = Date.now() - scrollStart;
  const domAfterScroll = await readDomStats(page);

  const longTasksRapidScroll = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let count = 0;
      const observer = new PerformanceObserver((list) => {
        count += list.getEntries().length;
      });
      observer.observe({ type: 'longtask', buffered: true });
      const gridEl = document.querySelector('[role="grid"]');
      if (!gridEl) {
        observer.disconnect();
        resolve(0);
        return;
      }
      let pos = 0;
      const step = () => {
        pos += 200;
        (gridEl as HTMLElement).scrollTop = pos;
        if (pos < gridEl.scrollHeight) {
          requestAnimationFrame(step);
        } else {
          setTimeout(() => {
            observer.disconnect();
            resolve(count);
          }, 500);
        }
      };
      requestAnimationFrame(step);
    });
  });

  return {
    grid,
    query,
    renderMs,
    afterRender,
    scroll: {
      nodesDelta: (afterScroll.nodesCount ?? 0) - (beforeScroll.nodesCount ?? 0),
      layoutDelta: (afterScroll.layoutCount ?? 0) - (beforeScroll.layoutCount ?? 0),
      styleDelta: (afterScroll.styleRecalcCount ?? 0) - (beforeScroll.styleRecalcCount ?? 0),
      heapDeltaBytes: (afterScroll.jsHeapUsedSize ?? 0) - (beforeScroll.jsHeapUsedSize ?? 0),
      durationMs: scrollDurationMs,
    },
    domInitial,
    domAfterScroll,
    longTasksRapidScroll,
    heapUsedMb: (afterRender.jsHeapUsedSize ?? 0) / (1024 * 1024),
  };
};

test.describe('Grid A/B performance comparison', () => {
  test('TanStack vs UnifiedDataTable CDP metrics', async ({ page }) => {
    test.setTimeout(300_000);
    await setupDiscover(page);

    const tanstack = await measureGrid(page, 'TanStackDataGrid', ROW_BASE);
    console.log('\n=== TanStack ===');
    console.log(JSON.stringify(tanstack, null, 2));

    await switchGridViaUi(page);
    const unified = await measureGrid(page, 'UnifiedDataTable', ROW_BASE, { submitQuery: false });
    console.log('\n=== UnifiedDataTable ===');
    console.log(JSON.stringify(unified, null, 2));

    const results = {
      generatedAt: new Date().toISOString(),
      environment: {
        kibanaUrl: KIBANA_URL,
        viewport: { width: 1440, height: 900 },
        dataset: 'ROW ... // 200x (1600 synthetic rows)',
      },
      runs: [tanstack, unified],
    };

    const outPath = path.join(__dirname, 'compare_grids_perf.results.json');
    writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log(`\nWrote ${outPath}`);

    expect(tanstack.domInitial.rowCount).toBeGreaterThan(0);
    expect(unified.domInitial.rowCount).toBeGreaterThan(0);
  });
});
