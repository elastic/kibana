/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export const expectSidebarState = async (page: ScoutPage, expanded: boolean) => {
  await expect(page.testSubj.locator('fieldList')).toBeVisible({ visible: expanded });
  await expect(page.testSubj.locator('dscHideSidebarButton')).toBeVisible({ visible: expanded });
  await expect(page.testSubj.locator('dscShowSidebarButton')).toBeVisible({ visible: !expanded });
};

/**
 * Builds an assertion for the state of Discover's sidebar / histogram / table
 * panel toggles, binding the page objects so each call site only names the
 * state it expects.
 */
export const createPanelsStateAssertion =
  (page: ScoutPage) =>
  async ({ sidebar, chart, table }: { sidebar: boolean; chart: boolean; table: boolean }) => {
    await expectSidebarState(page, sidebar);

    await expect(page.testSubj.locator('unifiedHistogramChart')).toBeVisible({ visible: chart });
    await expect(page.testSubj.locator('discoverDocTable')).toBeVisible({ visible: table });

    // The toggle renders inside the histogram while it is expanded, and falls
    // back to the page once the histogram is collapsed.
    await expect(page.testSubj.locator('dscPanelsToggleInHistogram')).toBeVisible({
      visible: chart,
    });
    await expect(page.testSubj.locator('dscPanelsToggleInPage')).toBeVisible({ visible: !chart });

    await expect(page.testSubj.locator('dscHideHistogramButton')).toBeVisible({ visible: chart });
    await expect(page.testSubj.locator('dscShowHistogramButton')).toBeVisible({ visible: !chart });
    await expect(page.testSubj.locator('dscHideTableButton')).toBeVisible({ visible: table });
    await expect(page.testSubj.locator('dscShowTableButton')).toBeVisible({ visible: !table });

    // The last expanded panel cannot be collapsed, so its hide button is disabled.
    if (chart && table) {
      await expect(page.testSubj.locator('dscHideHistogramButton')).toBeEnabled();
      await expect(page.testSubj.locator('dscHideTableButton')).toBeEnabled();
    } else if (chart) {
      await expect(page.testSubj.locator('dscHideHistogramButton')).toBeDisabled();
    } else if (table) {
      await expect(page.testSubj.locator('dscHideTableButton')).toBeDisabled();
    }
  };

/**
 * Same as {@link createPanelsStateAssertion} for data sources that cannot render
 * a histogram at all — a data view without a time field, or an ES|QL query over
 * one. The chart is absent rather than collapsed, so the table is always shown
 * and only the sidebar can be toggled.
 */
export const createChartlessPanelsStateAssertion =
  (page: ScoutPage) =>
  async ({ sidebar }: { sidebar: boolean }) => {
    await expectSidebarState(page, sidebar);

    await expect(page.testSubj.locator('unifiedHistogramChart')).toBeHidden();
    await expect(page.testSubj.locator('discoverDocTable')).toBeVisible();

    // With no chart there is nothing to collapse, so the toggle lives in the
    // page and offers neither a histogram nor a table control.
    await expect(page.testSubj.locator('dscPanelsToggleInPage')).toBeVisible();
    await expect(page.testSubj.locator('dscPanelsToggleInHistogram')).toBeHidden();
    for (const button of [
      'dscHideHistogramButton',
      'dscShowHistogramButton',
      'dscHideTableButton',
      'dscShowTableButton',
    ]) {
      await expect(page.testSubj.locator(button)).toBeHidden();
    }
  };
