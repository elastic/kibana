/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EventLoopUtilizationWithLoad } from '@kbn/core-metrics-server';
import type { EventLoopUtilization } from 'perf_hooks';
import { performance } from 'perf_hooks';
import { LoadWindow } from './load_window';

const LOAD_WINDOW_SIZE_SHORT = 3;
const LOAD_WINDOW_SIZE_MED = 6;
const LOAD_WINDOW_SIZE_LONG = 12;

export class EventLoopUtilizationMonitor {
  private elu: EventLoopUtilization;
  private loadWindow = new LoadWindow(LOAD_WINDOW_SIZE_LONG);

  /**
   * Creating a new instance of EventLoopUtilizationMonitor will capture the
   * current ELU to use as a point of comparison against the first call to
   * `collect`.
   */
  constructor() {
    this.elu = performance.eventLoopUtilization();
  }

  /**
   * Get ELU between now and last time the ELU was reset.
   */
  public collect(): EventLoopUtilizationWithLoad {
    const { active, idle, utilization } = performance.eventLoopUtilization(this.elu);
    this.loadWindow.addObservation(utilization);

    return {
      active,
      idle,
      utilization,
      load: {
        short: this.loadWindow.getAverage(LOAD_WINDOW_SIZE_SHORT),
        medium: this.loadWindow.getAverage(LOAD_WINDOW_SIZE_MED),
        long: this.loadWindow.getAverage(LOAD_WINDOW_SIZE_LONG),
      },
    };
  }

  /**
   * Resets the ELU to now. Will be used to calculate the diff on the next call to `collect`.
   */
  public reset() {
    this.elu = performance.eventLoopUtilization();
  }
}
