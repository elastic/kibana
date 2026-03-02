/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Playwright performance analysis script for the TanStack Virtual POC grid.
 *
 * Usage:
 *   npx playwright test src/platform/plugins/shared/discover/public/components/discover_grid/perf_tanstack_virtual_grid.playwright.ts
 *
 * Environment variables:
 *   KIBANA_URL  - base URL  (default: https://kertal-branch-virtualized-list-experiment.kbndev.co)
 *   KIBANA_USER - login user (default: elastic)
 *   KIBANA_PASS - login password (default: changeme)
 */

/* eslint-disable no-console, import/no-extraneous-dependencies */

import { test, expect, type CDPSession, type Page } from '@playwright/test';

const KIBANA_URL =
  process.env.KIBANA_URL ?? 'https://kertal-branch-virtualized-list-experiment.kbndev.co';
const SAVED_SEARCH_PATH = '/app/discover#/view/0613fa47-b5b7-4181-ba12-91500fa2c0bd';
const KIBANA_USER = process.env.KIBANA_USER ?? 'elastic';
const KIBANA_PASS = process.env.KIBANA_PASS ?? 'changeme';

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

const diffSnapshots = (before: PerfSnapshot, after: PerfSnapshot) => {
  const diff: Record<string, { before: number; after: number; delta: number }> = {};
  for (const key of Object.keys(after) as Array<keyof PerfSnapshot>) {
    if (key === 'timestamp') continue;
    const b = before[key] ?? 0;
    const a = after[key] ?? 0;
    diff[key] = { before: b, after: a, delta: a - b };
  }
  return diff;
};

const login = async (page: Page) => {
  await page.goto(`${KIBANA_URL}/login`);
  const userField = page.locator('[data-test-subj="loginUsername"]');
  if (await userField.isVisible({ timeout: 5000 }).catch(() => false)) {
    await userField.fill(KIBANA_USER);
    await page.locator('[data-test-subj="loginPassword"]').fill(KIBANA_PASS);
    await page.locator('[data-test-subj="loginSubmit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 });
  }
};

test.describe('TanStack Virtual POC - performance analysis', () => {
  test('measure initial render & scroll performance', async ({ page }) => {
    test.setTimeout(120_000);

    await login(page);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');

    const beforeNav = await captureCDPMetrics(cdp);

    await page.goto(`${KIBANA_URL}${SAVED_SEARCH_PATH}`, { waitUntil: 'domcontentloaded' });

    const pocBadge = page.getByText('TanStack Virtual POC');
    await expect(pocBadge).toBeVisible({ timeout: 60_000 });

    const afterRender = await captureCDPMetrics(cdp);
    const renderDiff = diffSnapshots(beforeNav, afterRender);

    console.log('\n=== INITIAL RENDER METRICS ===');
    console.table(renderDiff);

    const gridDomStats = await page.evaluate(() => {
      const grid = document.querySelector('[role="grid"]');
      if (!grid) return { totalNodes: 0, rowCount: 0, cellCount: 0 };
      return {
        totalNodes: grid.querySelectorAll('*').length,
        rowCount: grid.querySelectorAll('[role="row"]').length,
        cellCount: grid.querySelectorAll('[role="gridcell"]').length,
      };
    });

    console.log('\n=== DOM NODE COUNTS (initial) ===');
    console.table(gridDomStats);

    await cdp.send('Tracing.start', {
      categories: ['devtools.timeline', 'v8.execute'].join(','),
      options: 'sampling-frequency=1000',
    });

    const beforeScroll = await captureCDPMetrics(cdp);

    const scrollContainer = page.locator('[role="grid"]');
    await scrollContainer.evaluate((el) => {
      el.scrollTo({ top: el.scrollHeight / 2, behavior: 'smooth' });
    });
    await page.waitForTimeout(1500);

    await scrollContainer.evaluate((el) => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
    await page.waitForTimeout(1500);

    await scrollContainer.evaluate((el) => {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    });
    await page.waitForTimeout(1500);

    const afterScroll = await captureCDPMetrics(cdp);
    const scrollDiff = diffSnapshots(beforeScroll, afterScroll);

    const traceBuffer = await cdp.send('Tracing.end');
    void traceBuffer;

    console.log('\n=== SCROLL PERFORMANCE METRICS (3 scrolls: mid -> end -> top) ===');
    console.table(scrollDiff);

    const gridDomStatsAfterScroll = await page.evaluate(() => {
      const grid = document.querySelector('[role="grid"]');
      if (!grid) return { totalNodes: 0, rowCount: 0, cellCount: 0 };
      return {
        totalNodes: grid.querySelectorAll('*').length,
        rowCount: grid.querySelectorAll('[role="row"]').length,
        cellCount: grid.querySelectorAll('[role="gridcell"]').length,
      };
    });

    console.log('\n=== DOM NODE COUNTS (after scroll) ===');
    console.table(gridDomStatsAfterScroll);

    const longTaskCount = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let count = 0;
        const observer = new PerformanceObserver((list) => {
          count += list.getEntries().length;
        });
        observer.observe({ type: 'longtask', buffered: true });

        const grid = document.querySelector('[role="grid"]');
        if (grid) {
          let pos = 0;
          const step = () => {
            pos += 200;
            grid.scrollTop = pos;
            if (pos < grid.scrollHeight) {
              requestAnimationFrame(step);
            } else {
              setTimeout(() => {
                observer.disconnect();
                resolve(count);
              }, 500);
            }
          };
          requestAnimationFrame(step);
        } else {
          resolve(0);
        }
      });
    });

    console.log(`\n=== LONG TASKS during rapid scroll: ${longTaskCount} ===`);

    const scrollDiffMetrics = scrollDiff;
    console.log('\n=== SUMMARY ===');
    console.log(`Initial DOM nodes in grid: ${gridDomStats.totalNodes}`);
    console.log(`DOM nodes after scroll:    ${gridDomStatsAfterScroll.totalNodes}`);
    console.log(
      `DOM node churn on scroll:  ${scrollDiffMetrics.nodesCount?.delta ?? 0} (page-wide)`
    );
    console.log(`Layout recalcs on scroll:  ${scrollDiffMetrics.layoutCount?.delta ?? 0}`);
    console.log(`Style recalcs on scroll:   ${scrollDiffMetrics.styleRecalcCount?.delta ?? 0}`);
    console.log(`Long tasks (rapid scroll): ${longTaskCount}`);

    await cdp.send('Performance.disable');
    await cdp.detach();
  });
});
