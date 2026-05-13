/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Minimal workflow-execution-state collaborator needed by flow-control nodes.
 *
 * The plugin's concrete `WorkflowExecutionState` class has additional I/O
 * methods (ES persistence, task-recovery helpers) that do not belong in the
 * package layer. Only the loop-output eviction surface is needed by nodes in
 * this package.
 */
export interface IWorkflowExecutionState {
  /**
   * Removes output entries for stale loop iterations so they no longer
   * pollute the workflow context after a loop exits or breaks.
   */
  evictStaleLoopOutputs(innerStepIds: Iterable<string>): void;
}
