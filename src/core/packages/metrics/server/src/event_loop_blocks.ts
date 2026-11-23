/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The execution context of code found running during an event loop block: the `type`, `name` and
 * `id` of a `KibanaExecutionContext`. The contexts nested in it are left out.
 *
 * @public
 */
export interface EventLoopBlockExecutionContext {
  readonly type?: string;
  readonly name?: string;
  readonly id?: string;
}

/**
 * How often an execution context was found running during an event loop block.
 *
 * @public
 */
export interface EventLoopBlockContextSamples {
  readonly context: EventLoopBlockExecutionContext;
  /** Number of samples that found this context running. */
  readonly samples: number;
}

/**
 * What the main thread was running during an event loop block, from samples taken while it lasted.
 *
 * @public
 */
export interface EventLoopBlockContexts {
  /** Number of samples taken during the block. */
  readonly samples: number;
  /** Samples that found code running outside any execution context. */
  readonly withoutContext: number;
  /** The execution contexts found running, most samples first. Only the most sampled are kept. */
  readonly top: readonly EventLoopBlockContextSamples[];
}

/**
 * A block of the main thread's event loop, reported by the event loop watchdog once it has ended.
 *
 * @public
 */
export interface EventLoopBlock {
  /** When the block started, in milliseconds since the Unix epoch. */
  readonly startedAt: number;
  /** How long the block lasted, in milliseconds. */
  readonly blockedMs: number;
  /** Whether the block started while Kibana was starting, or once it was running. */
  readonly phase: 'starting' | 'running';
  /**
   * What was running during the block. Unset when the block ended before its first sample, or
   * when sampling it failed.
   */
  readonly contexts?: EventLoopBlockContexts;
}
