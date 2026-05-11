/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'fs';
import * as path from 'path';
import type { RunnerResult } from 'lighthouse';
import { tags } from '@kbn/scout';
import { perfLighthouseTest } from '../../../../src/lighthouse/fixture';
import {
  DEVTOOLS_DESKTOP_THROTTLING,
  type PerfLighthouseAuditOptions,
} from '../../../../src/lighthouse/types';

interface KbnLoadMark {
  detail: string;
  startTime: number;
}

interface PageMetrics {
  performanceScore: number | null;
  fcpMs: number;
  lcpMs: number;
  tbtMs: number;
  clsScore: number;
  siMs: number;
  ttiMs: number;
  firstAppNav?: number;
  bootstrapStarted?: number;
}

const results: Record<string, PageMetrics> = {};

const throttleMode = process.env.LIGHTHOUSE_THROTTLE ?? 'provided';

const getAuditOptions = (): PerfLighthouseAuditOptions => {
  if (throttleMode === 'devtools') {
    return {
      throttlingMethod: 'devtools',
      throttling: DEVTOOLS_DESKTOP_THROTTLING,
      maxWaitForLoad: 120000,
      onlyCategories: ['performance'],
    };
  }
  return {
    throttlingMethod: 'provided',
    maxWaitForLoad: 30000,
    onlyCategories: ['performance'],
  };
};

/**
 * Chrome trace event shape for `blink.user_timing` mark events.
 * Lighthouse's TraceEvent type doesn't include `detail` on `args.data`,
 * but Chrome 104+ serializes `performance.mark(name, { detail })` into
 * `args.data.detail` for string values.
 */
interface KbnLoadTraceEvent {
  name: string;
  cat: string;
  ph: string;
  ts: number;
  args: {
    data?: {
      detail?: string;
      isLoadingMainFrame?: boolean;
    };
  };
}

/**
 * Chrome JSON-encodes `detail` values in trace events, so a JS string
 * `'load_started'` appears as `'"load_started"'` in the trace. Parse it
 * back to the original value.
 */
const parseTraceDetail = (raw: string): string => {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : raw;
  } catch {
    return raw;
  }
};

/**
 * Extract Kibana's custom `kbnLoad` performance marks from Lighthouse's
 * raw Chrome trace events.
 *
 * Kibana uses `performance.mark('kbnLoad', { detail: 'phase_name' })`.
 * The Lighthouse user-timings audit strips `args` when building its table,
 * losing the `detail` property. We bypass the audit and read directly from
 * `artifacts.Trace.traceEvents` where Chrome serializes the full mark data
 * including `args.data.detail`.
 */
const extractKbnLoadMarks = (result: RunnerResult): KbnLoadMark[] => {
  const traceEvents = result.artifacts?.Trace?.traceEvents as KbnLoadTraceEvent[] | undefined;
  if (!traceEvents?.length) return [];

  const navigationStart = traceEvents.find(
    (evt) =>
      evt.name === 'navigationStart' &&
      evt.cat.includes('blink.user_timing') &&
      evt.args?.data?.isLoadingMainFrame
  );
  if (!navigationStart) return [];

  const timeOriginUs = navigationStart.ts;

  return traceEvents
    .filter(
      (evt) =>
        evt.cat.includes('blink.user_timing') &&
        evt.name === 'kbnLoad' &&
        (evt.ph === 'R' || evt.ph === 'I' || evt.ph === 'i') &&
        typeof evt.args?.data?.detail === 'string'
    )
    .sort((a, b) => a.ts - b.ts)
    .map((evt) => ({
      detail: parseTraceDetail(evt.args.data!.detail!),
      startTime: (evt.ts - timeOriginUs) / 1000,
    }));
};

const extractMetrics = (result: RunnerResult, kbnMarks: KbnLoadMark[]): PageMetrics => {
  const { lhr } = result;
  const getNumericValue = (auditId: string): number =>
    (lhr.audits[auditId]?.numericValue as number) ?? 0;

  let firstAppNav: number | undefined;
  let bootstrapStarted: number | undefined;

  for (const mark of kbnMarks) {
    if (mark.detail === 'first_app_nav') {
      firstAppNav = Math.round(mark.startTime);
    }
    if (mark.detail === 'bootstrap_started') {
      bootstrapStarted = Math.round(mark.startTime);
    }
  }

  return {
    performanceScore: lhr.categories.performance?.score ?? null,
    fcpMs: Math.round(getNumericValue('first-contentful-paint')),
    lcpMs: Math.round(getNumericValue('largest-contentful-paint')),
    tbtMs: Math.round(getNumericValue('total-blocking-time')),
    clsScore: getNumericValue('cumulative-layout-shift'),
    siMs: Math.round(getNumericValue('speed-index')),
    ttiMs: Math.round(getNumericValue('interactive')),
    firstAppNav,
    bootstrapStarted,
  };
};

perfLighthouseTest.describe(
  'Lighthouse Page Load Performance',
  { tag: [...tags.stateful.classic, ...tags.performance] },
  () => {
    const auditOptions = getAuditOptions();

    perfLighthouseTest('Home page audit', async ({ browserAuth, lighthouse, page, kbnUrl }) => {
      await browserAuth.loginAsAdmin();

      // Warm-up: navigate to the page to populate server-side caches
      try {
        await page.goto(kbnUrl.get('/app/home'));
        await page.waitForLoadState('networkidle', { timeout: 15000 });
      } catch {
        // Warm-up may timeout with dev bundles; that is acceptable
      }

      const url = kbnUrl.get('/app/home');
      const result = await lighthouse.runAudit(url, auditOptions);
      const kbnMarks = extractKbnLoadMarks(result);
      results.home = extractMetrics(result, kbnMarks);
    });

    perfLighthouseTest(
      'eCommerce Dashboard audit',
      async ({ browserAuth, lighthouse, page, kbnUrl }) => {
        await browserAuth.loginAsAdmin();

        try {
          await page.goto(
            kbnUrl.get(
              '/app/dashboards#/view/722b74f0-b882-11e8-a6d9-e546fe2bba5f?_g=(filters:!())'
            )
          );
          await page.waitForLoadState('networkidle', { timeout: 15000 });
        } catch {
          // Warm-up
        }

        const url = kbnUrl.get(
          '/app/dashboards#/view/722b74f0-b882-11e8-a6d9-e546fe2bba5f?_g=(filters:!())'
        );
        const result = await lighthouse.runAudit(url, auditOptions);
        const kbnMarks = extractKbnLoadMarks(result);
        results.dashboard = extractMetrics(result, kbnMarks);
      }
    );

    perfLighthouseTest.afterAll(() => {
      const resultFile = process.env.PERF_LH_RESULT_FILE;
      if (resultFile) {
        const dir = path.dirname(resultFile);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
      }
    });
  }
);
