/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface TrackUiMetricOptions {
  /**
   * Custom callback to handle UI metric tracking.
   * By default, metrics are ignored in standalone mode.
   */
  onCount?: (eventName: string) => void;
  onLoad?: (eventName: string) => void;
}

/**
 * Creates a trackUiMetric utility for standalone packaging.
 * In standalone mode, UI metrics are typically not sent to Kibana's telemetry service.
 * However, you can provide custom handlers to integrate with your own analytics.
 *
 * @param options - Configuration options for metric tracking
 * @returns A trackUiMetric implementation for standalone use
 *
 * @example
 * ```ts
 * const trackUiMetric = createTrackUiMetric({
 *   onCount: (event) => console.log('Count metric:', event),
 *   onLoad: (event) => console.log('Load metric:', event),
 * });
 * ```
 */
export function createTrackUiMetric(options: TrackUiMetricOptions = {}) {
  const { onCount = () => {}, onLoad = () => {} } = options;

  return {
    count: (eventName: string) => onCount(eventName),
    load: (eventName: string) => onLoad(eventName),
  };
}
