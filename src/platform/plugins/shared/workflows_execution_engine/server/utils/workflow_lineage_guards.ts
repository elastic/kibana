/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** One ancestor in a sub-workflow chain, and how it invoked the next run down. */
export interface ExecutionChainHop {
  readonly executionId: string;
  readonly invocation: 'sync' | 'async';
  readonly workflowId: string;
}

const isExecutionChainHop = (value: unknown): value is ExecutionChainHop => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { executionId, invocation, workflowId } = value as Record<string, unknown>;
  return (
    typeof executionId === 'string' &&
    executionId.length > 0 &&
    typeof workflowId === 'string' &&
    (invocation === 'sync' || invocation === 'async')
  );
};

/** True when the context carries a non-empty `executionChain` whose every hop is well formed. */
export const hasExecutionChain = (
  context: Record<string, unknown> | undefined
): context is Record<string, unknown> & { executionChain: readonly ExecutionChainHop[] } =>
  Array.isArray(context?.executionChain) &&
  context.executionChain.length > 0 &&
  context.executionChain.every(isExecutionChainHop);

/** Copies only a hop's own fields, so a stored hop with extra keys can't leak them. */
export const toExecutionChainHop = ({
  executionId,
  invocation,
  workflowId,
}: ExecutionChainHop): ExecutionChainHop => ({ executionId, invocation, workflowId });
