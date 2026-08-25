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
  executionId?: string;
  context?: Record<string, unknown>;
}

export const buildReplayInputsFromExecutionContext = (
  context: Record<string, unknown> | undefined
): Record<string, unknown> => {
  if (!context) {
    return {};
  }

  const inputs = isPlainObject(context.inputs) ? (context.inputs as Record<string, unknown>) : {};

  return {
    ...inputs,
    ...(context.event !== undefined && { event: context.event }),
  };
};
