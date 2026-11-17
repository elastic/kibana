/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@playwright/test';

/** Anything that can register an init script: a Playwright `BrowserContext` or `Page`. */
export interface ElasticChartDebugTarget {
  addInitScript: (script: () => void) => Promise<unknown>;
}

/**
 * Enables the `@elastic/charts` debug state for every page loaded in the given browser context
 * (or for the given page). The flag is read while the chart mounts, so call this before navigating.
 * The debug state is then exposed in the `data-ech-debug-state` attribute of `.echChartStatus`.
 */
export const enableElasticChartDebug = async (target: ElasticChartDebugTarget): Promise<void> => {
  await target.addInitScript(() => {
    (window as unknown as { _echDebugStateFlag?: boolean })._echDebugStateFlag = true;
  });
};

const CHART_STATUS_SELECTOR = '.echChartStatus';
const CHART_RENDER_COMPLETE_SELECTOR = `${CHART_STATUS_SELECTOR}[data-ech-render-complete="true"]`;

interface ChartWaitOptions {
  timeout?: number;
}

/**
 * Locates the `@elastic/charts` status node(s) inside `chart` that have finished rendering.
 * Useful for assertions that need to count rendered charts, e.g. `.not.toHaveCount(0)`.
 */
export const getRenderedChartStatus = (chart: Locator): Locator =>
  chart.locator(CHART_RENDER_COMPLETE_SELECTOR);

/** Waits until the `@elastic/charts` chart inside `chart` has finished rendering. */
export const waitForChartRenderComplete = async (
  chart: Locator,
  options: ChartWaitOptions = {}
): Promise<void> => {
  await getRenderedChartStatus(chart).waitFor({ state: 'attached', ...options });
};

/**
 * Waits for the chart inside `chart` to finish rendering, then returns its `@elastic/charts`
 * debug state. Requires {@link enableElasticChartDebug} to have run before the page was loaded.
 * Pass the `DebugState` type from `@elastic/charts` as `T` to get a typed result.
 */
export const getChartDebugState = async <T = Record<string, any>>(
  chart: Locator,
  options: ChartWaitOptions = {}
): Promise<T> => {
  await waitForChartRenderComplete(chart, options);
  const debugJson = await chart.locator(CHART_STATUS_SELECTOR).getAttribute('data-ech-debug-state');
  if (!debugJson) {
    throw new Error(
      'Elastic charts debugState not found. Call enableElasticChartDebug() before navigation'
    );
  }
  return JSON.parse(debugJson) as T;
};
