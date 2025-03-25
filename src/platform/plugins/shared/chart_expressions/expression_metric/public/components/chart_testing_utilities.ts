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

/**
 * This is a minimum set of settings override required by Elastic Charts in order to work with RTL
 * for some reason this is only required in a jsdom/jest environment and not in a real browser
 */
export function getChartOverridesFix() {
  return {
    settings: {
      theme: {
        scales: {
          barsPadding: 0,
        },
        chartPaddings: {
          top: 0,
          right: 0,
          left: 0,
          bottom: 0,
        },
        colors: {
          defaultVizColor: '#FFF',
        },
        chartMargins: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
        heatmap: {
          xAxisLabel: {
            rotation: 0,
          },
        },
      },
    },
  };
}
