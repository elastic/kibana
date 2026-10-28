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
        parentWorkflowId: 'other',
      },
    ],
  ])(
    "makes a top-level parent (triggered by %s) the chain's only hop, ignoring any stored lineage",
    (triggeredBy, context) => {
      expect(
        buildChildLineageContext({
          invocation: 'sync',
          parent: { context, id: 'top-exec-1', triggeredBy, workflowId: 'top-workflow-id' },
        })
      ).toEqual({ executionChain: [ROOT_HOP] });
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

  it('appends the parent to its stored chain when the parent is itself a child', () => {
    expect(
      buildChildLineageContext({
        invocation: 'async',
        parent: {
          context: {
            executionChain: [ROOT_HOP],
            parentWorkflowExecutionId: 'top-exec-1',
            parentWorkflowId: 'top-workflow-id',
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
    });
  });

  it("drops extra keys from the parent's stored hops", () => {
    expect(
      buildChildLineageContext({
        invocation: 'sync',
        parent: {
          context: {
            executionChain: [{ ...ROOT_HOP, extra: 'not reported' }],
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
    ['an empty chain', { executionChain: [] }],
    ['a chain that is not an array', { executionChain: 'top-exec-1' }],
    [
      'a chain with a malformed hop',
      { executionChain: [{ executionId: 'top-exec-1', invocation: 'later', workflowId: 'w' }] },
    ],
  ])('writes nothing when the parent is a child with %s', (_label, context) => {
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

  it('a child parent with no chain writes nothing', () => {
    expect(
      buildChildLineageContext({
        invocation: 'sync',
        parent: {
          context: undefined,
          id: 'child-exec-1',
          triggeredBy: 'workflow-step',
          workflowId: 'child-workflow-id',
        },
      })
    ).toEqual({});
  });
});
