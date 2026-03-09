/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

let wasHiddenDuringLoad = false;
let visibilityCleanup: (() => void) | null = null;

export const getWasHiddenDuringLoad = () => wasHiddenDuringLoad;

/**
 * Dashboards can be backgrounded while loading (e.g. switching browser tabs), which pauses requestAnimationFrame calls and, hence,
 * the dashboard-loaded event. This can artificially inflate the load time metrics for both the dashboard as a whole and the visualizations.
 *
 * To account for this, we track if the dashboard was backgrounded at any point during loading and include that in our
 * telemetry. We also want to avoid tracking visibility changes across multiple dashboard loads, so we set up a new listener
 * on each load and clean it up when it's no longer needed.
 */
export const startDashboardVisibilityTracking = (): void => {
  // Clean up any existing listener and reset flag
  stopDashboardVisibilityTracking();
  wasHiddenDuringLoad = false;

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      wasHiddenDuringLoad = true;
    }
  };

  // If tab is already hidden when tracking starts, set flag
  if (document.visibilityState === 'hidden') {
    wasHiddenDuringLoad = true;
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);
  visibilityCleanup = () =>
    document.removeEventListener('visibilitychange', handleVisibilityChange);
};

export const stopDashboardVisibilityTracking = (): void => {
  visibilityCleanup?.();
  visibilityCleanup = null;
};
