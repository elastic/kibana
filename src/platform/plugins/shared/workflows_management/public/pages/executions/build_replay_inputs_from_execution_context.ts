/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObject } from 'lodash/fp';

export interface RerunWorkflowExecutionParams {
  workflowId: string;
  /**
   * Execution to re-run. When `context` is not supplied (e.g. from the executions
   * list, which intentionally omits `context` for payload size), the re-run handler
   * fetches the full execution by this id to recover the original inputs/event.
   */
  executionId?: string;
  context?: Record<string, unknown>;
}

export const buildReplayInputsFromExecutionContext = (
  context: Record<string, unknown> | undefined
): Record<string, unknown> => {
  if (!context) {
    return {};
  }

  return {
    ...(isPlainObject(context.inputs) && (context.inputs as object)),
    ...(context.event !== undefined && { event: context.event }),
  };
};
