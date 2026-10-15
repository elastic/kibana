/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildChildLineageContext } from './build_child_lineage_context';

const ROOT_HOP = {
  executionId: 'top-exec-1',
  invocation: 'sync',
  workflowId: 'top-workflow-id',
} as const;

describe('buildChildLineageContext', () => {
  it.each([
    ['manual', { inputs: {} }],
    [undefined, undefined],
    [
      'scheduled',
      {
        executionChain: [{ executionId: 'other-exec', invocation: 'async', workflowId: 'other' }],
        parentWorkflowExecutionId: 'other-parent-exec',
        rootWorkflowExecutionId: 'other-exec',
      },
    ],
  ])(
    'makes a top-level parent (triggered by %s) the root and the only hop, ignoring any stored lineage',
    (triggeredBy, context) => {
      expect(
        buildChildLineageContext({
          invocation: 'sync',
          parent: { context, id: 'top-exec-1', triggeredBy, workflowId: 'top-workflow-id' },
        })
      ).toEqual({ executionChain: [ROOT_HOP], rootWorkflowExecutionId: 'top-exec-1' });
    }
  );

  it.each(['sync', 'async'] as const)(
    "records a %s call as the parent hop's invocation",
    (invocation) => {
      expect(
        buildChildLineageContext({
          invocation,
          parent: { id: 'top-exec-1', triggeredBy: 'manual', workflowId: 'top-workflow-id' },
        }).executionChain
      ).toEqual([{ ...ROOT_HOP, invocation }]);
    }
  );

  it("copies the parent's root and appends the parent to its chain when the parent is itself a child", () => {
    expect(
      buildChildLineageContext({
        invocation: 'async',
        parent: {
          context: {
            executionChain: [ROOT_HOP],
            parentWorkflowExecutionId: 'top-exec-1',
            parentWorkflowId: 'top-workflow-id',
            rootWorkflowExecutionId: 'top-exec-1',
          },
          id: 'child-exec-1',
          triggeredBy: 'workflow-step',
          workflowId: 'child-workflow-id',
        },
      })
    ).toEqual({
      executionChain: [
        ROOT_HOP,
        { executionId: 'child-exec-1', invocation: 'async', workflowId: 'child-workflow-id' },
      ],
      rootWorkflowExecutionId: 'top-exec-1',
    });
  });

  it("drops extra keys from the parent's stored hops", () => {
    expect(
      buildChildLineageContext({
        invocation: 'sync',
        parent: {
          context: {
            executionChain: [{ ...ROOT_HOP, extra: 'not reported' }],
            rootWorkflowExecutionId: 'top-exec-1',
          },
          id: 'child-exec-1',
          triggeredBy: 'workflow-step',
          workflowId: 'child-workflow-id',
        },
      }).executionChain
    ).toEqual([
      ROOT_HOP,
      { executionId: 'child-exec-1', invocation: 'sync', workflowId: 'child-workflow-id' },
    ]);
  });

  it.each([
    [
      'no stored lineage',
      { parentWorkflowExecutionId: 'unknown-exec', parentWorkflowId: 'unknown' },
    ],
    [
      'a root that is not a string',
      { parentWorkflowExecutionId: 'unknown-exec', rootWorkflowExecutionId: 7 },
    ],
    ['an empty chain', { executionChain: [] }],
    ['a chain that is not an array', { executionChain: 'top-exec-1' }],
    [
      'a chain with a malformed hop',
      { executionChain: [{ executionId: 'top-exec-1', invocation: 'later', workflowId: 'w' }] },
    ],
  ])('returns no lineage keys when the parent is a child with %s', (_label, context) => {
    expect(
      buildChildLineageContext({
        invocation: 'sync',
        parent: {
          context,
          id: 'pre-upgrade-child-exec',
          triggeredBy: 'workflow-step',
          workflowId: 'child-workflow-id',
        },
      })
    ).toEqual({});
  });

  it("keeps the parent's root but writes no chain when the parent has a root and no chain", () => {
    expect(
      buildChildLineageContext({
        invocation: 'sync',
        parent: {
          context: { rootWorkflowExecutionId: 'top-exec-1' },
          id: 'child-exec-1',
          triggeredBy: 'workflow-step',
          workflowId: 'child-workflow-id',
        },
      })
    ).toEqual({ rootWorkflowExecutionId: 'top-exec-1' });
  });
});
