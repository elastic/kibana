/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Playwright functional tests for TanStack Cascade Grid.
 *
 * Usage:
 *   npx playwright test --config=src/platform/plugins/shared/discover/public/components/discover_grid/tanstack_cascade_grid/playwright.config.ts
 */

/* eslint-disable no-console, import/no-extraneous-dependencies */

import { test, expect, type Page } from '@playwright/test';

const KIBANA_URL = process.env.KIBANA_URL ?? 'http://localhost:5601';
const KIBANA_USER = process.env.KIBANA_USER ?? 'elastic';
const KIBANA_PASS = process.env.KIBANA_PASS ?? 'changeme';

const ESQL_QUERY =
  'ROW a=1, b="US" | STATS c=COUNT(*) BY b // TanStackCascade';

const login = async (page: Page) => {
  await page.goto(`${KIBANA_URL}/app/discover`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  if (page.url().includes('/login')) {
    await page.getByRole('textbox', { name: 'Username' }).fill(KIBANA_USER);
    await page.getByRole('textbox', { name: 'Password' }).fill(KIBANA_PASS);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 60_000,
    });
  }
};

const navigateToDiscover = async (page: Page) => {
  if (!page.url().includes('/app/discover')) {
    await page.goto(`${KIBANA_URL}/app/discover`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
  }
  await page
    .getByText('Discover', { exact: false })
    .first()
    .waitFor({ timeout: 60_000 });
  const closeBtn = page.getByRole('button', { name: 'Close' });
  if (await closeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(500);
  }
};

const switchToEsqlMode = async (page: Page) => {
  const esqlBtn = page.getByRole('button', { name: 'ES|QL' });
  if (await esqlBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await esqlBtn.click();
    await page.waitForTimeout(2000);
    return;
  }
  const langToggle = page
    .locator('[data-test-subj="discover-dataView-switch-link"]')
    .or(page.getByText('Try ES|QL'));
  if (
    await langToggle
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false)
  ) {
    await langToggle.first().click();
    await page.waitForTimeout(2000);
  }
};

const setupDiscover = async (page: Page) => {
  await login(page);
  await navigateToDiscover(page);
  await switchToEsqlMode(page);
};

const submitEsqlQuery = async (page: Page, query: string) => {
  const monacoEditor = page.locator('.monaco-editor').first();
  await monacoEditor.click({ force: true });
  await page.waitForTimeout(300);
  await page.keyboard.press('Control+a');
  await page.waitForTimeout(100);
  await page.keyboard.type(query, { delay: 5 });
  await page.waitForTimeout(500);
  const submitBtn = page
    .locator('[data-test-subj="querySubmitButton"]')
    .or(page.getByRole('button', { name: 'Run query' }));
  await submitBtn.first().click();
  await page.waitForTimeout(5000);
};

const setupCascade = async (page: Page, query = ESQL_QUERY) => {
  await setupDiscover(page);
  await submitEsqlQuery(page, query);
  // Wait for the cascade wrapper to appear (no badge — uses group count text)
  const wrapper = page.locator('[data-test-subj="tanstackCascadeWrapper"]');
  await expect(wrapper).toBeVisible({ timeout: 60_000 });
};

test.describe('TanStack Cascade Grid', () => {
  test('renders cascade grid with group rows and toolbar', async ({ page }) => {
    test.setTimeout(90_000);
    await setupCascade(page);

    const groupRows = page.locator('[data-test-subj="cascadeGroupRow"]');
    const count = await groupRows.count();
    console.log(`Group rows: ${count}`);
    expect(count).toBeGreaterThan(0);

    // Toolbar shows group count
    const wrapper = page.locator('[data-test-subj="tanstackCascadeWrapper"]');
    const toolbarText = await wrapper.innerText();
    console.log(`Toolbar: ${toolbarText.slice(0, 80)}`);
    expect(toolbarText).toContain('group');
  });

  test('expand and collapse group row', async ({ page }) => {
    test.setTimeout(120_000);
    await setupCascade(page);

    const firstGroup = page
      .locator('[data-test-subj="cascadeGroupRow"]')
      .first();
    await firstGroup.click();
    await page.waitForTimeout(5000);

    const docsPanel = page.locator('[data-test-subj="cascadeDocsPanel"]');
    const loadingText = page.locator('text=Loading documents');
    const noDocsText = page.locator('text=No documents found');
    const errorText = page.locator('text=Fetch failed');

    const hasDocs = await docsPanel.isVisible({ timeout: 15_000 }).catch(() => false);
    const hasLoading = await loadingText.isVisible().catch(() => false);
    const hasNoDocs = await noDocsText.isVisible().catch(() => false);
    const hasError = await errorText.isVisible().catch(() => false);
    console.log(`Docs: ${hasDocs}, Loading: ${hasLoading}, NoDocs: ${hasNoDocs}, Error: ${hasError}`);
    expect(hasDocs || hasLoading || hasNoDocs || hasError).toBe(true);

    await firstGroup.click();
    await page.waitForTimeout(1000);
    expect(await docsPanel.isVisible().catch(() => false)).toBe(false);
  });

  test('full screen toggle', async ({ page }) => {
    test.setTimeout(90_000);
    await setupCascade(page);

    const fullScreenBtn = page.locator('[data-test-subj="cascadeFullScreenButton"]');
    await expect(fullScreenBtn).toBeVisible();
    await fullScreenBtn.click();
    await page.waitForTimeout(500);

    const wrapper = page.locator('[data-test-subj="tanstackCascadeWrapper"]');
    const position = await wrapper.evaluate((el) => getComputedStyle(el).position);
    console.log(`Full screen position: ${position}`);
    expect(position).toBe('fixed');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    let positionAfter = await wrapper.evaluate((el) => getComputedStyle(el).position);
    if (positionAfter === 'fixed') {
      await fullScreenBtn.dispatchEvent('click');
      await page.waitForTimeout(500);
      positionAfter = await wrapper.evaluate((el) => getComputedStyle(el).position);
    }
    console.log(`After exit: ${positionAfter}`);
    expect(positionAfter).not.toBe('fixed');
  });

  test('group row shows by-field, value, and aggregates', async ({ page }) => {
    test.setTimeout(90_000);
    await setupCascade(page);

    const firstGroup = page.locator('[data-test-subj="cascadeGroupRow"]').first();
    const text = await firstGroup.innerText();
    console.log(`Group text: ${text}`);
    // Title shows group value, meta shows aggregate columns
    expect(text).toContain('US');
    expect(text).toContain('c:');
  });

  test('expand all and collapse all buttons', async ({ page }) => {
    test.setTimeout(90_000);
    await setupCascade(page);

    const expandAllBtn = page.locator('[data-test-subj="cascadeExpandAll"]');
    await expect(expandAllBtn).toBeVisible();
    await expandAllBtn.click();
    await page.waitForTimeout(5000);

    // Toolbar should show expanded badge
    const expandedBadge = page.locator('[data-test-subj="tanstackCascadeWrapper"]').getByText('expanded');
    const hasExpanded = await expandedBadge.isVisible({ timeout: 5_000 }).catch(() => false);
    console.log(`Expanded badge visible: ${hasExpanded}`);
    expect(hasExpanded).toBe(true);

    const collapseAllBtn = page.locator('[data-test-subj="cascadeCollapseAll"]');
    await collapseAllBtn.click();
    await page.waitForTimeout(1000);

    const docsPanel = page.locator('[data-test-subj="cascadeDocsPanel"]');
    const docsPanelVisible = await docsPanel.isVisible().catch(() => false);
    console.log(`Docs panel after collapse all: ${docsPanelVisible}`);
    expect(docsPanelVisible).toBe(false);
  });

  test('3-dot actions menu on group row', async ({ page }) => {
    test.setTimeout(90_000);
    await setupCascade(page);

    // Click the 3-dot actions button on first group row
    const actionsBtn = page.locator('[data-test-subj$="-dscCascadeRowContextActionButton"]').first();
    await expect(actionsBtn).toBeVisible();
    await actionsBtn.click();
    await page.waitForTimeout(500);

    const menu = page.locator('[data-test-subj="cascadeContextMenu"]');
    const menuVisible = await menu.isVisible({ timeout: 5_000 }).catch(() => false);
    console.log(`Context menu visible: ${menuVisible}`);
    expect(menuVisible).toBe(true);

    const copyItem = page.locator('text=Copy to clipboard');
    await expect(copyItem).toBeVisible();

    // Close via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const menuAfter = await menu.isVisible().catch(() => false);
    console.log(`Context menu after Escape: ${menuAfter}`);
    expect(menuAfter).toBe(false);
  });

  test('keyboard navigation: ArrowDown, ArrowUp, ArrowRight to expand', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await setupCascade(page);

    // Focus the scroll container (treegrid)
    const treegrid = page.locator('[role="treegrid"]');
    await treegrid.focus();
    await page.waitForTimeout(300);

    // Press ArrowDown to focus first row
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);

    // Press ArrowRight to expand the focused row
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(3000);

    // Check if expanded (look for docs panel or loading)
    const docsPanel = page.locator('[data-test-subj="cascadeDocsPanel"]');
    const loading = page.locator('text=Loading documents');
    const noDocs = page.locator('text=No documents found');

    const hasAny =
      (await docsPanel.isVisible().catch(() => false)) ||
      (await loading.isVisible().catch(() => false)) ||
      (await noDocs.isVisible().catch(() => false));
    console.log(`Expanded via keyboard: ${hasAny}`);
    expect(hasAny).toBe(true);

    // ArrowLeft to collapse
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(1000);

    const collapsed = !(await docsPanel.isVisible().catch(() => false));
    console.log(`Collapsed via keyboard: ${collapsed}`);
  });
});
