/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IStepExecutionRuntime } from './step_execution_runtime';

/**
 * Interface for node implementations within the workflow execution engine.
 * These implementations define the behavior of various workflow steps.
 */
export interface INodeImplementation {
  /** Executes the node's logic. */
  run(): Promise<void> | void;
}

/**
 * Node implementation that can catch errors within its scope.
 * For example, retry steps or continue steps.
 */
export interface INodeWithErrorCatching {
  /**
   * Handles errors that occur within the node's execution context.
   * @param failedContext The context of the failed step execution.
   */
  catchError(failedContext: IStepExecutionRuntime): Promise<void> | void;
}

/**
 * Node implementation monitoring its scope.
 * For example, timeout zones.
 */
export interface IMonitorableNode {
  /**
   * Monitors the execution context of the node.
   * @param monitoredContext The context of the monitored step execution.
   */
  monitor(monitoredContext: IStepExecutionRuntime): Promise<void> | void;
}

/**
 * Node implementation with explicit cancellation cleanup.
 *
 * Steps that hold external resources (child workflow executions, long-running
 * connections, etc.) implement this to perform teardown when cancelled.
 * `onCancel` is called after the abort signal fires and the step is marked
 * as cancelled — it fires in both the running and waiting states, giving
 * the step a guaranteed cleanup entry point without re-invoking `run()`.
 *
 * Implementations must be idempotent.
 */
export interface ICancellableNode {
  onCancel(): Promise<void> | void;
}

export const isCancellableNode = (
  node: INodeImplementation
): node is INodeImplementation & ICancellableNode => {
  return typeof (node as unknown as ICancellableNode).onCancel === 'function';
};
