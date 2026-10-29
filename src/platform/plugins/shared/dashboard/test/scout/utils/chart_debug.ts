/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DebugState } from '@elastic/charts';
import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export const PIE_CHART = 'partitionVisChart';
export const POLL_OPTIONS = { timeout: 30_000 };

export const getChartDebugState = async (page: ScoutPage, chartTestSubj: string, nth = 0) => {
  const status = page.testSubj.locator(chartTestSubj).nth(nth).locator('.echChartStatus');
  // The chart may be absent, still mounting or showing an empty state, so don't wait for it
  if ((await status.count()) === 0) return undefined;
  const debugState = await status.getAttribute('data-ech-debug-state');
  return debugState ? (JSON.parse(debugState) as DebugState) : undefined;
};

export const getPieSlices = (debugState?: DebugState) =>
  debugState?.partition?.[0]?.partitions ?? [];

export const getPieSliceCount = async (page: ScoutPage) =>
  getPieSlices(await getChartDebugState(page, PIE_CHART)).length;

export const getSliceCountForAllPies = async (page: ScoutPage) => {
  const pieCount = await page.testSubj.locator(PIE_CHART).count();
  let total = 0;
  for (let i = 0; i < pieCount; i++) {
    total += getPieSlices(await getChartDebugState(page, PIE_CHART, i)).length;
  }
  return total;
};

export const filterOnPieSlice = async (page: ScoutPage, name: string) => {
  const pie = page.testSubj.locator(PIE_CHART);
  const slice = getPieSlices(await getChartDebugState(page, PIE_CHART)).find(
    ({ name: sliceName }) => String(sliceName) === name
  );
  expect(slice, `pie slice "${name}" should exist`).toBeDefined();
  await pie.click({ position: { x: slice!.coords[0], y: slice!.coords[1] } });
  const actionsMenu = page.testSubj.locator('multipleActionsContextMenu');
  if (await actionsMenu.isVisible()) {
    await actionsMenu.getByText('Apply filter to current view').click();
  }
};
