/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
