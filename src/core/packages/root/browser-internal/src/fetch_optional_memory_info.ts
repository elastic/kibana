/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * `Performance.memory` output.
 * https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory
 */
export interface BrowserPerformanceMemoryInfo {
  /**
   * The maximum size of the heap, in bytes, that is available to the context.
   */
  jsHeapSizeLimit: number;
  /**
   * The total allocated heap size, in bytes.
   */
  totalJSHeapSize: number;
  /**
   * The currently active segment of JS heap, in bytes.
   */
  usedJSHeapSize: number;
}

/**
 * Get performance information from the browser (non-standard property).
 * @remarks Only available in Google Chrome and MS Edge for now.
 */
export function fetchOptionalMemoryInfo(): BrowserPerformanceMemoryInfo | undefined {
  // @ts-expect-error 2339
  const memory = window.performance.memory;
  if (memory) {
    return {
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      totalJSHeapSize: memory.totalJSHeapSize,
      usedJSHeapSize: memory.usedJSHeapSize,
    };
  }
}
