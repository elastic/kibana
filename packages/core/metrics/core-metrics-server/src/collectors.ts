/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { MaybePromise } from '@kbn/utility-types';
import type { IntervalHistogram } from './metrics';

/** Base interface for all metrics gatherers */
export interface MetricsCollector<T> {
  /** collect the data currently gathered by the collector */
  collect(): MaybePromise<T>;
  /** reset the internal state of the collector */
  reset(): void;
}

/**
 * Creating a new instance from EventLoopDelaysMonitor will
 * automatically start tracking event loop delays.
 * See {@link IntervalHistogram}
 * @public
 *
 */
export interface IEventLoopDelaysMonitor<T = IntervalHistogram> {
  /**
   * Collect gathers event loop delays metrics from nodejs perf_hooks.monitorEventLoopDelay
   * the histogram calculations start from the last time `reset` was called or this
   * EventLoopDelaysMonitor instance was created.
   *
   * Returns metrics in milliseconds.

   * @returns {IntervalHistogram}
   */
  collect(): T;
  /**
   * Resets the collected histogram data.
   */
  reset(): void;
  /**
   * Disables updating the interval timer for collecting new data points.
   */
  stop(): void;
}
