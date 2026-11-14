/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hasExecutionChain, toExecutionChainHop } from './workflow_lineage_guards';

const HOP = {
  executionId: 'root-exec-1',
  invocation: 'sync',
  workflowId: 'root-workflow',
} as const;

describe('hasExecutionChain', () => {
  it.each([
    ['one hop', [HOP]],
    ['several hops', [HOP, { executionId: 'child-exec-1', invocation: 'async', workflowId: 'c' }]],
    ['a hop whose workflow id is empty (an unsaved test run)', [{ ...HOP, workflowId: '' }]],
  ])('returns true for a chain with %s', (_label, executionChain) => {
    expect(hasExecutionChain({ executionChain })).toBe(true);
  });

  it.each([
    ['an undefined context', undefined],
    ['a missing chain', { parentWorkflowExecutionId: 'parent-exec-1' }],
    ['an empty chain', { executionChain: [] }],
    ['a chain that is not an array', { executionChain: HOP }],
    ['a null hop', { executionChain: [HOP, null] }],
    ['a hop with an empty execution id', { executionChain: [{ ...HOP, executionId: '' }] }],
    ['a hop without a workflow id', { executionChain: [{ executionId: 'e', invocation: 'sync' }] }],
    ['a hop with an unknown invocation', { executionChain: [{ ...HOP, invocation: 'deferred' }] }],
  ])('returns false for %s', (_label, context) => {
    expect(hasExecutionChain(context)).toBe(false);
  });
});

describe('toExecutionChainHop', () => {
  it("copies only a hop's own fields", () => {
    expect(toExecutionChainHop({ ...HOP, extra: 'dropped' } as typeof HOP)).toEqual(HOP);
  });
});
