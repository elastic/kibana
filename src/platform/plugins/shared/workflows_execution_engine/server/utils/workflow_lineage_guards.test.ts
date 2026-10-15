/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  hasExecutionChain,
  hasParentWorkflowExecution,
  hasRootWorkflowExecutionId,
  toExecutionChainHop,
} from './workflow_lineage_guards';

describe('hasParentWorkflowExecution', () => {
  it('returns true when the context carries a string parentWorkflowExecutionId', () => {
    expect(hasParentWorkflowExecution({ parentWorkflowExecutionId: 'parent-exec-1' })).toBe(true);
  });

  it('returns false when parentWorkflowExecutionId is missing', () => {
    expect(hasParentWorkflowExecution({ parentWorkflowId: 'parent-workflow-id' })).toBe(false);
  });

  it('returns false when parentWorkflowExecutionId is an empty string', () => {
    expect(hasParentWorkflowExecution({ parentWorkflowExecutionId: '' })).toBe(false);
  });

  it('returns false when parentWorkflowExecutionId is not a string', () => {
    expect(hasParentWorkflowExecution({ parentWorkflowExecutionId: 42 })).toBe(false);
  });

  it('returns false for an undefined context', () => {
    expect(hasParentWorkflowExecution(undefined)).toBe(false);
  });
});

describe('hasRootWorkflowExecutionId', () => {
  it('returns true when the context carries a string rootWorkflowExecutionId', () => {
    expect(hasRootWorkflowExecutionId({ rootWorkflowExecutionId: 'root-exec-1' })).toBe(true);
  });

  it('returns false when rootWorkflowExecutionId is missing', () => {
    expect(hasRootWorkflowExecutionId({ parentWorkflowExecutionId: 'parent-exec-1' })).toBe(false);
  });

  it('returns false when rootWorkflowExecutionId is an empty string', () => {
    expect(hasRootWorkflowExecutionId({ rootWorkflowExecutionId: '' })).toBe(false);
  });

  it('returns false when rootWorkflowExecutionId is not a string', () => {
    expect(hasRootWorkflowExecutionId({ rootWorkflowExecutionId: 7 })).toBe(false);
  });

  it('returns false for an undefined context', () => {
    expect(hasRootWorkflowExecutionId(undefined)).toBe(false);
  });
});

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
    ['a missing chain', { rootWorkflowExecutionId: 'root-exec-1' }],
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
