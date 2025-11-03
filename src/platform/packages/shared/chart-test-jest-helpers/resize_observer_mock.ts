/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Minimal mock implementation of the browser's ResizeObserver API for chart testing.
 *
 * Elastic Charts require a ResizeObserver event to trigger initial rendering in tests.
 * This mock simulates a resize event with a fixed size (500x500) to bootstrap chart rendering.
 *
 * Usage:
 * - Used internally by setupChartMocks to replace the global ResizeObserver during tests.
 * - The observe() method triggers a resize event asynchronously, allowing charts to detect their container size.
 * - unobserve() and disconnect() are no-ops for compatibility.
 */
class ResizeObserverMock {
  private cb: Function | undefined;
  constructor(cb: Function) {
    this.cb = cb;
  }
  observe() {
    setTimeout(() => {
      this.cb?.([{ contentRect: { width: 500, height: 500 } }]);
    }, 0);
  }
  unobserve() {}
  disconnect() {}
}

let roPrevious: typeof global.ResizeObserver | undefined;
/**
 * Installs the ResizeObserverMock globally, replacing the browser's ResizeObserver.
 * Call this before running chart tests to ensure charts receive a resize event and render correctly in RTL.
 */
export function setupResizeObserverMock() {
  roPrevious = global.ResizeObserver;
  global.ResizeObserver = ResizeObserverMock;
}

/**
 * Restores the original global ResizeObserver after tests.
 * Call this after your chart tests to clean up the mock and avoid side effects in other tests.
 */
export function cleanResizeObserverMock() {
  if (roPrevious) {
    global.ResizeObserver = roPrevious;
  }
}
