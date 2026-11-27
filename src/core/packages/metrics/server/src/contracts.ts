/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { EventLoopBlock } from './event_loop_blocks';
import type { EluMetrics, OpsMetrics } from './metrics';

/**
 * APIs to retrieves metrics gathered and exposed by the core platform.
 *
 * @public
 */
export interface MetricsServiceSetup {
  /** Interval metrics are collected in milliseconds */
  readonly collectionInterval: number;

  /**
   * Retrieve an observable emitting {@link EluMetrics}.
   */
  getEluMetrics$(): Observable<EluMetrics>;

  /**
   * Retrieve an observable emitting the {@link OpsMetrics} gathered.
   * The observable will emit an initial value during core's `start` phase, and a new value every fixed interval of time,
   * based on the `opts.interval` configuration property.
   *
   * @example
   * ```ts
   * core.metrics.getOpsMetrics$().subscribe(metrics => {
   *   // do something with the metrics
   * })
   * ```
   */
  getOpsMetrics$: () => Observable<OpsMetrics>;

  /**
   * Retrieve an observable emitting each {@link EventLoopBlock} the event loop watchdog detects on
   * the main thread, once the block has ended. It emits nothing while the watchdog is off.
   *
   * @example
   * ```ts
   * core.metrics.getEventLoopBlocks$().subscribe(({ blockedMs, contexts }) => {
   *   // contexts?.top lists the execution contexts found running during the block
   * })
   * ```
   */
  getEventLoopBlocks$(): Observable<EventLoopBlock>;
}
/**
 * {@inheritdoc MetricsServiceSetup}
 *
 * @public
 */
export type MetricsServiceStart = MetricsServiceSetup;
