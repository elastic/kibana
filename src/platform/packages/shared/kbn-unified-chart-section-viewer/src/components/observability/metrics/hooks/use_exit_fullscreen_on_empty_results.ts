/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';

export interface UseExitFullscreenOnEmptyResultsParams {
  /** Current fullscreen state, as persisted in `useMetricsExperienceState`. */
  isFullscreen: boolean;
  /** Skip while a fetch is in flight; `metricItems` may still be from the previous request. */
  isLoading: boolean;
  /** Skip when the chart section is hidden; there is no settled fetch to act on. */
  isComponentVisible: boolean;
  /** Whether the last `METRICS_INFO` response returned any metric (before search filtering). */
  hasMetrics: boolean;
  /** Called to leave fullscreen. */
  onExitFullscreen: () => void;
}

/**
 * Leave fullscreen for good once the grid has no metrics to render.
 *
 * The fullscreen overlay lives inside the chart section, which Discover
 * detaches when the current time range returns no documents. That makes
 * fullscreen look like it exited while `isFullscreen` is still `true`, so the
 * overlay came back on its own as soon as the time range returned data again.
 * Clearing the state here keeps fullscreen an explicit user action: it only
 * opens again when the user asks for it.
 *
 * We only act on a settled fetch for a visible chart section: while loading
 * (or on a freshly restored or duplicated Discover tab) `metricItems` is
 * momentarily empty, and exiting then would discard restored intent.
 */
export function useExitFullscreenOnEmptyResults({
  isFullscreen,
  isLoading,
  isComponentVisible,
  hasMetrics,
  onExitFullscreen,
}: UseExitFullscreenOnEmptyResultsParams): void {
  useEffect(() => {
    if (!isFullscreen || isLoading || !isComponentVisible || hasMetrics) {
      return;
    }
    onExitFullscreen();
  }, [isFullscreen, isLoading, isComponentVisible, hasMetrics, onExitFullscreen]);
}
