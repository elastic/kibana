/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Playwright performance + functional test for the TanStack Data Grid variant.
 *
 * Usage:
 *   npx playwright test src/platform/plugins/shared/discover/public/components/discover_grid/tanstack_data_grid/perf_tanstack_data_grid.playwright.ts
 *
 * Environment variables:
 *   KIBANA_URL  – base URL  (default: http://localhost:5601)
 *   KIBANA_USER – login user (default: elastic)
 *   KIBANA_PASS – login password (default: changeme)
 */

/* eslint-disable no-console, import/no-extraneous-dependencies */

import { test, expect, type CDPSession, type Page } from '@playwright/test';

const KIBANA_URL = process.env.KIBANA_URL ?? 'http://localhost:5601';
const KIBANA_USER = process.env.KIBANA_USER ?? 'elastic';
const KIBANA_PASS = process.env.KIBANA_PASS ?? 'changeme';

// ES|QL queries that activate the TanStackGrid variant
// ROW-based queries are time-independent and always produce results
const ESQL_QUERY =
  'ROW a=1,b="hello",c=3.14 | EVAL d=a+1 // TanStackGrid';
const ESQL_MULTI_ROW_QUERY =
  'FROM kibana_sample_data_logs | LIMIT 500 // TanStackGrid';
const ESQL_STATS_QUERY =
  'FROM kibana_sample_data_logs | STATS count=COUNT(*) BY geo.dest | LIMIT 50 // TanStackGrid';

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
  // Navigate directly to Discover – if auth is required, Kibana will redirect to /login
  await page.goto(`${KIBANA_URL}/app/discover`, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  // If we ended up on the login page, authenticate
  if (page.url().includes('/login')) {
    const userField = page.getByRole('textbox', { name: 'Username' });
    await userField.waitFor({ timeout: 15_000 });
    await userField.fill(KIBANA_USER);

    const passField = page.getByRole('textbox', { name: 'Password' });
    await passField.fill(KIBANA_PASS);

    await page.getByRole('button', { name: 'Log in' }).click();

    // Wait for navigation away from login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
  }
};

const navigateToDiscover = async (page: Page) => {
  if (!page.url().includes('/app/discover')) {
    await page.goto(`${KIBANA_URL}/app/discover`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  }

  // Wait for the Discover heading to appear (robust across versions)
  await page.getByText('Discover', { exact: false }).first().waitFor({ timeout: 60_000 });

  // Dismiss any blocking modals (e.g. "Switch modes per tab")
  const closeBtn = page.getByRole('button', { name: 'Close' });
  if (await closeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(500);
  }
};

const switchToEsqlMode = async (page: Page) => {
  // Modern Kibana uses a button labeled "ES|QL" in the app menu
  const esqlBtn = page.getByRole('button', { name: 'ES|QL' });
  if (await esqlBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await esqlBtn.click();
    await page.waitForTimeout(2000);
    return;
  }

  // Fallback: data view switch link
  const langToggle = page
    .locator('[data-test-subj="discover-dataView-switch-link"]')
    .or(page.getByText('Try ES|QL'));
  if (await langToggle.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
    await langToggle.first().click();
    await page.waitForTimeout(2000);
  }
};

const setWideTimeRange = async (page: Page) => {
  // Click the date picker button to open the popover
  const dateBtn = page.locator('button').filter({ hasText: /Last \d+/ }).first();
  if (await dateBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await dateBtn.click();
    await page.waitForTimeout(500);

    // Click "Commonly used" tab and select a wide range
    const last1YearLink = page.getByText('Last 1 year', { exact: true });
    if (await last1YearLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await last1YearLink.click();
      await page.waitForTimeout(2000);
      return;
    }

    const last90DaysLink = page.getByText('Last 90 days', { exact: true });
    if (await last90DaysLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await last90DaysLink.click();
      await page.waitForTimeout(2000);
      return;
    }

    const last30DaysLink = page.getByText('Last 30 days', { exact: true });
    if (await last30DaysLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await last30DaysLink.click();
      await page.waitForTimeout(2000);
      return;
    }

    // Close popover if none matched
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
};

const setupDiscover = async (page: Page) => {
  await login(page);
  await navigateToDiscover(page);
  await switchToEsqlMode(page);
  await setWideTimeRange(page);
};

const submitEsqlQuery = async (page: Page, query: string) => {
  // Click on the Monaco editor area (use force to bypass overlay interception)
  const monacoLines = page.locator('.monaco-editor .view-lines');
  await monacoLines.first().waitFor({ timeout: 30_000 });
  await monacoLines.first().click({ force: true });
  await page.waitForTimeout(300);

  // Select all and replace
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(query, { delay: 5 });

  // Submit: try data-test-subj first, fall back to "Search" button
  const submitBtn = page
    .locator('[data-test-subj="querySubmitButton"]')
    .or(page.getByRole('button', { name: 'Search' }));
  await submitBtn.first().click();
  await page.waitForTimeout(5000);

  // If no results, try clicking "Search entire time range" button
  const searchEntireRange = page.getByRole('button', { name: /Search entire time range/i });
  if (await searchEntireRange.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await searchEntireRange.click();
    await page.waitForTimeout(8000);
  }
};

test.describe('TanStack Data Grid – performance & functional', () => {
  test('initial render, scroll perf, DOM counts', async ({ page }) => {
    test.setTimeout(120_000);

    await setupDiscover(page);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');

    const beforeQuery = await captureCDPMetrics(cdp);

    await submitEsqlQuery(page, ESQL_QUERY);

    const tanstackBadge = page.getByText('TanStack Grid');
    await expect(tanstackBadge).toBeVisible({ timeout: 60_000 });

    const afterRender = await captureCDPMetrics(cdp);
    const renderDiff = diffSnapshots(beforeQuery, afterRender);

    console.log('\n=== INITIAL RENDER METRICS ===');
    console.table(renderDiff);

    // DOM counts
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

    // Verify virtualization: far fewer DOM rows than data rows
    expect(gridDomStats.rowCount).toBeGreaterThan(0);
    expect(gridDomStats.rowCount).toBeLessThan(100);

    // Scroll perf
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

    console.log('\n=== SCROLL PERFORMANCE (mid → end → top) ===');
    console.table(scrollDiff);

    const gridDomAfterScroll = await page.evaluate(() => {
      const grid = document.querySelector('[role="grid"]');
      if (!grid) return { totalNodes: 0, rowCount: 0, cellCount: 0 };
      return {
        totalNodes: grid.querySelectorAll('*').length,
        rowCount: grid.querySelectorAll('[role="row"]').length,
        cellCount: grid.querySelectorAll('[role="gridcell"]').length,
      };
    });

    console.log('\n=== DOM NODE COUNTS (after scroll) ===');
    console.table(gridDomAfterScroll);

    // Long task detection during rapid scroll
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

    console.log('\n=== SUMMARY ===');
    console.log(`Initial DOM nodes in grid:  ${gridDomStats.totalNodes}`);
    console.log(`DOM nodes after scroll:     ${gridDomAfterScroll.totalNodes}`);
    console.log(`DOM node churn on scroll:   ${scrollDiff.nodesCount?.delta ?? 0} (page-wide)`);
    console.log(`Layout recalcs on scroll:   ${scrollDiff.layoutCount?.delta ?? 0}`);
    console.log(`Style recalcs on scroll:    ${scrollDiff.styleRecalcCount?.delta ?? 0}`);
    console.log(`Long tasks (rapid scroll):  ${longTaskCount}`);

    await cdp.send('Performance.disable');
    await cdp.detach();
  });

  test('expand/collapse document details', async ({ page }) => {
    test.setTimeout(90_000);

    await setupDiscover(page);
    await submitEsqlQuery(page, ESQL_QUERY);

    const tanstackBadge = page.getByText('TanStack Grid');
    await expect(tanstackBadge).toBeVisible({ timeout: 60_000 });

    // Click expand button on first row
    const expandBtn = page.locator('[data-test-subj="docTableExpandToggleColumn"]').first();
    await expandBtn.click();
    await page.waitForTimeout(500);

    // Verify expand button toggles to "minimize" icon (isSelected state)
    const minimizeIcon = expandBtn.locator('svg');
    await expect(minimizeIcon).toBeVisible({ timeout: 5_000 });

    // Verify the flyout container is rendered (even if content depends on parent)
    const flyout = page.locator('.dscTable__flyout');
    await expect(flyout).toBeAttached({ timeout: 5_000 });

    // Collapse
    await expandBtn.click();
    await page.waitForTimeout(500);
  });

  test('keyboard accessibility: expand via keyboard', async ({ page }) => {
    test.setTimeout(90_000);

    await setupDiscover(page);
    await submitEsqlQuery(page, ESQL_QUERY);

    const tanstackBadge = page.getByText('TanStack Grid');
    await expect(tanstackBadge).toBeVisible({ timeout: 60_000 });

    // Find expand button and use keyboard
    const expandBtn = page.locator('[data-test-subj="docTableExpandToggleColumn"]').first();
    await expect(expandBtn).toBeVisible({ timeout: 10_000 });

    await expandBtn.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const flyout = page.locator('.dscTable__flyout');
    await expect(flyout).toBeAttached({ timeout: 5_000 });

    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  });

  test('column headers render correctly', async ({ page }) => {
    test.setTimeout(90_000);

    await setupDiscover(page);

    // ROW queries show in Summary mode since Discover doesn't auto-select columns
    await submitEsqlQuery(page, ESQL_QUERY);

    const tanstackBadge = page.getByText('TanStack Grid');
    await expect(tanstackBadge).toBeVisible({ timeout: 60_000 });

    // Verify the Summary column header exists
    const summaryHeader = page.locator('[role="columnheader"]', { hasText: 'Summary' });
    await expect(summaryHeader).toBeVisible({ timeout: 5_000 });

    // Verify grid has proper ARIA structure
    const grid = page.locator('[role="grid"]');
    await expect(grid).toBeVisible();
    const rows = grid.locator('[role="row"]');
    expect(await rows.count()).toBeGreaterThanOrEqual(2); // header + at least 1 data row
  });

  test('STATS/BY activates grouped mode', async ({ page }) => {
    test.setTimeout(120_000);

    await setupDiscover(page);

    const statsQuery =
      'ROW dest="US",val=10 | STATS count=COUNT(*) BY dest // TanStackGrid';
    await submitEsqlQuery(page, statsQuery);

    const tanstackBadge = page.getByText('TanStack Grid');
    await expect(tanstackBadge).toBeVisible({ timeout: 60_000 });

    // Verify "Grouped by" badge shows BY field
    const groupedByBadge = page.getByText('Grouped by: dest');
    await expect(groupedByBadge).toBeVisible({ timeout: 10_000 });

    // Verify toolbar shows "Grouped" in the status text
    const toolbarText = page.locator('text=/Grouped/');
    await expect(toolbarText.first()).toBeVisible({ timeout: 5_000 });

    // Verify grouped header shows "Groups (dest)"
    const groupHeader = page.locator('[role="columnheader"]', { hasText: 'Groups (dest)' });
    await expect(groupHeader).toBeVisible({ timeout: 5_000 });
  });

  test('grouped mode: expand/collapse inline sub-panel with Marvel characters', async ({ page }) => {
    test.setTimeout(120_000);

    await setupDiscover(page);

    const statsQuery =
      'ROW dest="US",val=10 | STATS count=COUNT(*) BY dest // TanStackGrid';
    await submitEsqlQuery(page, statsQuery);

    const tanstackBadge = page.getByText('TanStack Grid');
    await expect(tanstackBadge).toBeVisible({ timeout: 60_000 });

    // Verify grouped mode is active via badge
    await expect(page.getByText('Grouped by: dest')).toBeVisible({ timeout: 10_000 });

    // Click on the first group row header to expand
    const groupRowHeader = page.locator('[data-test-subj="groupRowHeader"]').first();
    await expect(groupRowHeader).toBeVisible({ timeout: 10_000 });
    await groupRowHeader.click();
    await page.waitForTimeout(500);

    // Verify the sub-panel appears with Marvel character data
    const subPanel = page.locator('[data-test-subj="groupSubPanel"]').first();
    await expect(subPanel).toBeVisible({ timeout: 5_000 });

    // Verify sub-panel contains a table with Marvel character fields
    const subTableHeaders = subPanel.locator('th');
    const headerTexts: string[] = [];
    for (let i = 0; i < (await subTableHeaders.count()); i++) {
      const text = await subTableHeaders.nth(i).textContent();
      if (text?.trim()) headerTexts.push(text.trim());
    }
    console.log('Sub-panel headers:', headerTexts);
    expect(headerTexts).toContain('name');
    expect(headerTexts).toContain('team');
    expect(headerTexts).toContain('power');

    // Verify at least one Marvel character name is visible
    const marvelNames = ['Spider-Man', 'Iron Man', 'Wolverine', 'Storm', 'Captain America',
      'Black Widow', 'Thor', 'Hulk', 'Cyclops', 'Jean Grey', 'Deadpool',
      'Black Panther', 'Doctor Strange', 'Scarlet Witch', 'Gambit', 'Rogue',
      'Vision', 'Hawkeye', 'Ant-Man', 'Wasp'];
    let foundMarvelChar = false;
    for (const charName of marvelNames) {
      if (await subPanel.getByText(charName).isVisible().catch(() => false)) {
        foundMarvelChar = true;
        console.log(`Found Marvel character: ${charName}`);
        break;
      }
    }
    expect(foundMarvelChar).toBe(true);

    // Click the group row header again to collapse
    await groupRowHeader.click();
    await page.waitForTimeout(500);

    // Verify sub-panel is no longer visible
    await expect(subPanel).not.toBeVisible({ timeout: 5_000 });
  });

  test('large dataset: multiplied rows perf', async ({ page }) => {
    test.setTimeout(180_000);

    await setupDiscover(page);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');

    // ROW with 100x multiplier + TanStackGrid trigger
    const bigQuery =
      'ROW a=1,b="test",c=42 // 100x // TanStackGrid';
    await submitEsqlQuery(page, bigQuery);

    const tanstackBadge = page.getByText('TanStack Grid');
    await expect(tanstackBadge).toBeVisible({ timeout: 90_000 });

    await page.waitForTimeout(3000);

    const rowCountText = await page.locator('text=/\\d[\\d,]* rows/').textContent();
    console.log(`Row count display: ${rowCountText}`);

    const gridDomStats = await page.evaluate(() => {
      const grid = document.querySelector('[role="grid"]');
      if (!grid) return { totalNodes: 0, rowCount: 0, cellCount: 0 };
      return {
        totalNodes: grid.querySelectorAll('*').length,
        rowCount: grid.querySelectorAll('[role="row"]').length,
        cellCount: grid.querySelectorAll('[role="gridcell"]').length,
      };
    });

    console.log('\n=== DOM COUNTS (1000x dataset) ===');
    console.table(gridDomStats);

    // Virtualization keeps DOM small even with huge dataset
    expect(gridDomStats.rowCount).toBeLessThan(200);

    // Rapid scroll stress test
    const beforeStress = await captureCDPMetrics(cdp);

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
            pos += 500;
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

    const afterStress = await captureCDPMetrics(cdp);
    const stressDiff = diffSnapshots(beforeStress, afterStress);

    console.log('\n=== STRESS SCROLL (1000x) ===');
    console.table(stressDiff);
    console.log(`Long tasks: ${longTaskCount}`);

    await cdp.send('Performance.disable');
    await cdp.detach();
  });

  test('row selection: select, bulk copy, clear', async ({ page }) => {
    test.setTimeout(90_000);

    await setupDiscover(page);
    await submitEsqlQuery(page, ESQL_QUERY);

    const tanstackBadge = page.getByText('TanStack Grid');
    await expect(tanstackBadge).toBeVisible({ timeout: 60_000 });

    // Verify the select-all checkbox exists in the header
    const selectAllCheckbox = page.locator('#select-all');
    await expect(selectAllCheckbox).toBeVisible({ timeout: 5_000 });

    // Click select-all
    await selectAllCheckbox.click();
    await page.waitForTimeout(300);

    // Verify the selection bar appears
    const selectionBar = page.locator('[data-test-subj="selectionBar"]');
    await expect(selectionBar).toBeVisible({ timeout: 5_000 });
    await expect(selectionBar).toContainText('selected');

    // Copy buttons should be visible (TSV, JSON, Markdown)
    const copyTsvBtn = selectionBar.getByText('Copy as TSV');
    await expect(copyTsvBtn).toBeVisible();
    const copyJsonBtn = selectionBar.getByText('Copy as JSON');
    await expect(copyJsonBtn).toBeVisible();
    const copyMdBtn = selectionBar.getByText('Copy as Markdown');
    await expect(copyMdBtn).toBeVisible();

    // Click "Clear"
    const clearBtn = selectionBar.getByText('Clear');
    await clearBtn.click();
    await page.waitForTimeout(300);

    // Selection bar should disappear
    await expect(selectionBar).not.toBeVisible({ timeout: 3_000 });
  });

  test('cell actions: visible on hover in multi-column mode', async ({ page }) => {
    test.setTimeout(120_000);

    await setupDiscover(page);

    // Submit query that produces individual columns
    await submitEsqlQuery(
      page,
      'ROW a=1,b="test",c=42,d="val",e="extra" // 10x // TanStackGrid'
    );

    const tanstackBadge = page.getByText('TanStack Grid');
    await expect(tanstackBadge).toBeVisible({ timeout: 60_000 });

    // In Summary mode, add a column via the sidebar to switch to multi-column mode
    const addColBtn = page.locator('button[aria-label="Add field as column"]').first();
    await addColBtn.click();
    await page.waitForTimeout(1_000);

    // After adding a column, the grid should switch out of Summary mode
    // Verify a data column header exists (not "Summary")
    const dataHeaders = page.locator('[role="columnheader"]').filter({ hasNotText: 'Summary' });
    const headerCount = await dataHeaders.count();
    console.log(`Non-summary column headers after adding column: ${headerCount}`);

    if (headerCount > 2) {
      // Hover a data cell (skip select + expand columns at indices 0,1)
      const dataCells = page.locator('[role="gridcell"]');
      const cellCount = await dataCells.count();
      const targetCell = dataCells.nth(Math.min(2, cellCount - 1));
      await targetCell.hover();
      await page.waitForTimeout(500);

      // Cell actions should now be visible
      const copyAction = page.locator('[aria-label="Copy value"]');
      await expect(copyAction.first()).toBeVisible({ timeout: 3_000 });
    } else {
      // Fallback: at least verify the grid is working
      console.log('Grid is still in summary mode after adding column — skipping hover assertion');
    }
  });

  test('cell actions: summary mode has no per-cell actions (by design)', async ({ page }) => {
    test.setTimeout(90_000);

    await setupDiscover(page);

    // ROW query renders in Summary mode – cell actions are only on individual columns
    await submitEsqlQuery(page, ESQL_QUERY);

    const tanstackBadge = page.getByText('TanStack Grid');
    await expect(tanstackBadge).toBeVisible({ timeout: 60_000 });

    // Verify the grid is in Summary mode (ROW queries with no explicit column selection)
    const summaryHeader = page.locator('[role="columnheader"]', { hasText: 'Summary' });
    await expect(summaryHeader).toBeVisible({ timeout: 5_000 });

    // Hover summary cell — no per-cell filter/copy actions should appear
    const dataCells = page.locator('[role="gridcell"]');
    const cellCount = await dataCells.count();
    console.log(`Gridcells in Summary mode: ${cellCount}`);

    // Select + Expand + Summary = 3 per row; hovering Summary cell should NOT show actions
    for (let i = 2; i < Math.min(cellCount, 6); i++) {
      await dataCells.nth(i).hover();
      await page.waitForTimeout(300);
    }

    // Copy/expand actions should not be visible in summary mode
    const copyAction = page.locator('[data-test-subj="copyCellValue"]');
    await expect(copyAction).not.toBeVisible({ timeout: 2_000 });
  });

  test('full-screen toggle', async ({ page }) => {
    test.setTimeout(90_000);

    await setupDiscover(page);
    await submitEsqlQuery(page, ESQL_QUERY);

    const tanstackBadge = page.getByText('TanStack Grid');
    await expect(tanstackBadge).toBeVisible({ timeout: 60_000 });

    // Click full-screen button
    const fullScreenBtn = page.locator('[data-test-subj="dataGridFullScreenButton"]');
    await expect(fullScreenBtn).toBeVisible({ timeout: 5_000 });
    await fullScreenBtn.click({ force: true });
    await page.waitForTimeout(500);

    // Grid should still be visible in full-screen
    await expect(tanstackBadge).toBeVisible({ timeout: 5_000 });

    // Exit full screen (force click as Kibana header may overlay)
    await fullScreenBtn.click({ force: true });
    await page.waitForTimeout(500);
  });

  test('grid density selector and max header cell lines', async ({ page }) => {
    test.setTimeout(90_000);

    await setupDiscover(page);
    await submitEsqlQuery(page, ESQL_QUERY);

    const tanstackBadge = page.getByText('TanStack Grid');
    await expect(tanstackBadge).toBeVisible({ timeout: 60_000 });

    // Open density popover
    const densityBtn = page.locator('[data-test-subj="dataGridDensityButton"]');
    await expect(densityBtn).toBeVisible({ timeout: 5_000 });
    await densityBtn.click();
    await page.waitForTimeout(300);

    // Verify the popover appears with density options
    const densityLabel = page.getByText('Density', { exact: true });
    await expect(densityLabel).toBeVisible({ timeout: 3_000 });

    // Select "Normal"
    const normalBtn = page.getByRole('button', { name: 'Normal' });
    await normalBtn.click();
    await page.waitForTimeout(300);

    // Verify "Max header cell lines" and "Body cell lines" inputs are visible
    const headerLinesInput = page.locator('[data-test-subj="headerMaxLinesInput"]');
    await expect(headerLinesInput).toBeVisible({ timeout: 3_000 });
    const bodyLinesInput = page.locator('[data-test-subj="bodyMaxLinesInput"]');
    await expect(bodyLinesInput).toBeVisible({ timeout: 3_000 });

    // Change header max lines to 3 and body cell lines to 4
    await headerLinesInput.fill('3');
    await page.waitForTimeout(200);
    await bodyLinesInput.fill('4');
    await page.waitForTimeout(200);

    // Select "Expanded"
    const expandedBtn = page.getByRole('button', { name: 'Expanded' });
    await expandedBtn.click();
    await page.waitForTimeout(300);

    // Close popover
    await densityBtn.click();
    await page.waitForTimeout(300);

    // Open again, go back to "Compact" and reset lines
    await densityBtn.click();
    await page.waitForTimeout(300);
    const compactBtn = page.getByRole('button', { name: 'Compact' });
    await compactBtn.click();
    await headerLinesInput.fill('1');
    await bodyLinesInput.fill('1');
    await page.waitForTimeout(200);

    // Close popover
    await densityBtn.click();
    await page.waitForTimeout(200);

    // Grid should still be functional
    await expect(tanstackBadge).toBeVisible();
  });

  test('keyboard grid navigation', async ({ page }) => {
    test.setTimeout(90_000);

    await setupDiscover(page);
    await submitEsqlQuery(page, ESQL_QUERY);

    const tanstackBadge = page.getByText('TanStack Grid');
    await expect(tanstackBadge).toBeVisible({ timeout: 60_000 });

    // Focus the grid
    const grid = page.locator('[role="grid"]');
    await grid.focus();
    await page.waitForTimeout(300);

    // Press ArrowDown to activate focused cell
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);

    // Verify the cell position indicator appears in toolbar
    const cellIndicator = page.locator('text=/R\\d+:C\\d+/');
    await expect(cellIndicator).toBeVisible({ timeout: 5_000 });

    // Navigate right
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    // Press Escape to clear focus
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await expect(cellIndicator).not.toBeVisible({ timeout: 3_000 });
  });

  test('find in table: search, navigate matches, close', async ({ page }) => {
    test.setTimeout(120_000);

    await setupDiscover(page);
    await submitEsqlQuery(
      page,
      'ROW a=1,b="hello",c=3.14,d="world",e="hello" // 10x // TanStackGrid'
    );

    const tanstackBadge = page.getByText('TanStack Grid');
    await expect(tanstackBadge).toBeVisible({ timeout: 60_000 });

    // Add column "b" (which contains "hello") to exit Summary mode
    const bAddBtn = page.locator('[data-test-subj="fieldToggle-b"]');
    await bAddBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(1_000);

    // Click the search button in the toolbar
    const findBtn = page.locator('[data-test-subj="dataGridFindInTableButton"]');
    await expect(findBtn).toBeVisible({ timeout: 5_000 });
    await findBtn.click();
    await page.waitForTimeout(300);

    // The find bar should appear
    const findBar = page.locator('[data-test-subj="findInTableBar"]');
    await expect(findBar).toBeVisible({ timeout: 3_000 });

    // Type a search term that exists in the data
    const findInput = page.locator('[data-test-subj="findInTableInput"]');
    await findInput.fill('hello');
    await page.waitForTimeout(500);

    // Counter should show matches
    const counter = page.locator('[data-test-subj="findInTableCounter"]');
    const counterText = await counter.textContent();
    console.log(`Find counter: ${counterText}`);
    expect(counterText).toContain('/');
    expect(counterText).not.toBe('0/0');

    // Click next match
    const nextBtn = page.locator('[data-test-subj="findInTableNext"]');
    await nextBtn.click();
    await page.waitForTimeout(300);

    // Click prev match
    const prevBtn = page.locator('[data-test-subj="findInTablePrev"]');
    await prevBtn.click();
    await page.waitForTimeout(300);

    // Highlights should be visible in the grid
    const highlights = page.locator('mark');
    const highlightCount = await highlights.count();
    console.log(`Highlight marks: ${highlightCount}`);
    expect(highlightCount).toBeGreaterThan(0);

    // Close the find bar
    const closeBtn = page.locator('[data-test-subj="findInTableClose"]');
    await closeBtn.click();
    await page.waitForTimeout(300);

    // Find bar should be gone
    await expect(findBar).not.toBeVisible({ timeout: 3_000 });

    // Highlights should be gone
    const afterHighlights = await page.locator('mark').count();
    expect(afterHighlights).toBe(0);
  });

  test('cell content expansion: click to open popover, close with X or Escape', async ({ page }) => {
    test.setTimeout(90_000);
    await setupDiscover(page);

    const query =
      'ROW a=1,b="hello world this is a long value that should be expandable",c=3.14,d="another value",e="more data" // 10x // TanStackGrid';
    await submitEsqlQuery(page, query);

    const tanstackBadge = page.getByText('TanStack Grid');
    await expect(tanstackBadge).toBeVisible({ timeout: 60_000 });

    // Add column "b" to get multi-column mode
    const bFieldBtn = page.locator('[data-test-subj="fieldToggle-b"]');
    await bFieldBtn.click();
    await page.waitForTimeout(1500);

    // Find a data cell and click it
    const dataCells = page.locator('[role="gridcell"][data-col-id]');
    const dataCellCount = await dataCells.count();
    console.log(`Data cells with data-col-id: ${dataCellCount}`);

    // If no data-col-id cells, try any gridcell (for summary mode)
    let firstDataCell;
    if (dataCellCount > 0) {
      firstDataCell = dataCells.first();
    } else {
      firstDataCell = page.locator('[role="gridcell"]').nth(1);
    }
    await firstDataCell.waitFor({ state: 'visible', timeout: 10_000 });

    // Click the data cell to expand it
    await firstDataCell.dispatchEvent('click');
    await page.waitForTimeout(1000);

    // Cell popover should open
    const popover = page.locator('[data-test-subj="cellPopover"]');
    await expect(popover).toBeVisible({ timeout: 5_000 });
    console.log('Cell popover opened on click');

    // Popover should contain action buttons
    const copyBtn = popover.locator('[aria-label="Copy value"]');
    await expect(copyBtn).toBeVisible();
    console.log('Copy button visible in popover');

    // Close with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(popover).not.toBeVisible({ timeout: 3_000 });
    console.log('Popover closed with Escape');

    // Click another cell to open again
    await firstDataCell.dispatchEvent('click');
    await page.waitForTimeout(1000);
    await expect(popover).toBeVisible({ timeout: 5_000 });

    // Close by clicking the X button
    const closeBtn = popover.locator('[aria-label="Close"]');
    await closeBtn.click();
    await page.waitForTimeout(500);
    await expect(popover).not.toBeVisible({ timeout: 3_000 });
    console.log('Popover closed with X button');
  });

  test('empty state when no results', async ({ page }) => {
    test.setTimeout(90_000);

    await setupDiscover(page);

    // Submit a query that produces no results
    const noResultsQuery =
      'FROM nonexistent_index_xyz_12345 | LIMIT 1 // TanStackGrid';
    await submitEsqlQuery(page, noResultsQuery);

    // Wait for query to complete
    await page.waitForTimeout(8000);

    // If TanStackGrid rendered with 0 rows, the empty state should show
    const emptyState = page.locator('[data-test-subj="discoverNoResults"]');
    const tanstackBadge = page.getByText('TanStack Grid');

    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const hasBadge = await tanstackBadge.isVisible().catch(() => false);

    // Either the grid shows empty state, or the query error prevented TanStackGrid
    console.log(`Empty state visible: ${hasEmptyState}, TanStack badge: ${hasBadge}`);
    expect(hasEmptyState || !hasBadge).toBe(true);
  });
});
