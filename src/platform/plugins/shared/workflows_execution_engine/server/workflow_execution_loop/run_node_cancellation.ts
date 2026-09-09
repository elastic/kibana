/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createExecutionFence } from './execution_fence';
import type { NodeImplementation } from '../step/node_implementation';
import { isCancellableNode } from '../step/node_implementation';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

/**
 * Invokes the cancellable node's `onCancel` hook when the step's abort signal fired.
 * Errors are logged and swallowed so workflow teardown can continue.
 */
export async function runOnCancelIfNeeded(
  nodeImplementation: NodeImplementation,
  stepExecutionRuntime: StepExecutionRuntime,
  workflowLogger: IWorkflowEventLogger
): Promise<void> {
  if (
    !stepExecutionRuntime.abortController.signal.aborted ||
    !isCancellableNode(nodeImplementation)
  ) {
    return;
  }

  const cleanupFence = createExecutionFence();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      cleanupFence.run(() => Promise.resolve(nodeImplementation.onCancel())),
      new Promise<void>((resolve) => {
        timer = setTimeout(() => {
          workflowLogger.logWarn('Node cancellation cleanup exceeded its 1s deadline');
          resolve();
        }, 1000);
      }),
    ]);
  } catch (onCancelError) {
    workflowLogger.logError(
      'Failed to execute onCancel hook - continuing execution',
      onCancelError instanceof Error ? onCancelError : new Error(String(onCancelError))
    );
  } finally {
    cleanupFence.close();
    if (timer) clearTimeout(timer);
  }
}
