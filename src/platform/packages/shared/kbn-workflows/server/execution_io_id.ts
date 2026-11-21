/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ExecutionIoType = 'input' | 'output';

/** Stable IO document id for a step or workflow execution. */
export function executionIoId(type: ExecutionIoType, executionId: string): string {
  return `${type}:${executionId}`;
}

/** Splits an IO document id into its type and the step or workflow execution id. */
export function parseExecutionIoId(
  id: string
): { type: ExecutionIoType; executionId: string } | undefined {
  if (id.startsWith('input:')) {
    const executionId = id.slice('input:'.length);
    return executionId.length > 0 ? { type: 'input', executionId } : undefined;
  }
  if (id.startsWith('output:')) {
    const executionId = id.slice('output:'.length);
    return executionId.length > 0 ? { type: 'output', executionId } : undefined;
  }
  return undefined;
}
