/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Minimal IO-service collaborator needed by flow-control nodes that evict
 * stale loop outputs (foreach exit, while exit, loop-break, loop-continue).
 *
 * The plugin's concrete `StepIoService` owns the IO maps, ES persistence, and
 * eviction logic. Nodes only need the eviction surface.
 */
export interface IStepIoService {
  /**
   * Removes output entries for stale loop iterations so they no longer
   * pollute the workflow context after a loop exits or breaks.
   */
  evictStaleLoopOutputs(innerStepIds: Iterable<string>): void;
}
