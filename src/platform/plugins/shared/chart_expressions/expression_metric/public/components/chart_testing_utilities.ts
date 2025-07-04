/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 *  A set of chart mocks useful to test Elastic Charts with RTL
 * in particular the chart lifecycle requires the ResizeObserver to trigger a first event
 * in order to bootstrap the chart rendering, so here's a minimal ResizeObserverMock to help
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
  unobserve() {
    // do nothing
  }
  disconnect() {
    // do nothing
  }
}

let roPrevious: typeof global.ResizeObserver | undefined;

export function setupChartMocks() {
  roPrevious = global.ResizeObserver;
  global.ResizeObserver = ResizeObserverMock;
}

export function cleanChartMocks() {
  if (roPrevious) {
    global.ResizeObserver = roPrevious;
  }
}
