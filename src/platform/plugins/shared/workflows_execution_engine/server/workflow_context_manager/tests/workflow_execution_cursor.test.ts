/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import { WorkflowExecutionCursor } from '../workflow_execution_cursor';

describe('WorkflowExecutionCursor', () => {
  let workflowExecutionCursor: WorkflowExecutionCursor;
  let workflowExecutionGraph: WorkflowGraph;

  beforeEach(() => {
    workflowExecutionGraph = {
      topologicalOrder: ['node1', 'node2', 'node3'],
      getNode: jest.fn().mockImplementation((nodeId: string) => {
        if (nodeId === 'node1') {
          return { id: 'node1', stepId: 's1', type: 't1' } as GraphNodeUnion;
        }
        if (nodeId === 'node2') {
          return { id: 'node2', stepId: 's2', type: 't2' } as GraphNodeUnion;
        }
        if (nodeId === 'node3') {
          return { id: 'node3', stepId: 's3', type: 't3' } as GraphNodeUnion;
        }
        return undefined;
      }),
      getNodeStack: jest.fn().mockImplementation((nodeId: string) => [nodeId]),
    } as unknown as WorkflowGraph;

    workflowExecutionCursor = new WorkflowExecutionCursor({
      nodeId: 'node1',
      workflowExecutionGraph,
    });
  });

  it('starts with isExecuting true before start/stop', () => {
    expect(workflowExecutionCursor.isExecuting).toBe(true);
  });

  it('start sets isExecuting true', () => {
    workflowExecutionCursor.stop();
    workflowExecutionCursor.start();
    expect(workflowExecutionCursor.isExecuting).toBe(true);
  });

  it('stop clears isExecuting', () => {
    workflowExecutionCursor.stop();
    expect(workflowExecutionCursor.isExecuting).toBe(false);
  });

  it('currentNode returns graph node for current node id', () => {
    expect(workflowExecutionCursor.currentNode).toEqual(expect.objectContaining({ id: 'node1' }));
  });

  it('navigateToNode sets pending next node', () => {
    workflowExecutionCursor.navigateToNode('node3');
    expect(workflowExecutionCursor.nextNode).toEqual(expect.objectContaining({ id: 'node3' }));
    expect(workflowExecutionCursor.currentNode).toEqual(expect.objectContaining({ id: 'node1' }));
  });

  it('navigateToNode throws when node is missing', () => {
    (workflowExecutionGraph.getNode as jest.Mock).mockReturnValueOnce(undefined);
    expect(() => workflowExecutionCursor.navigateToNode('missing')).toThrow(
      'Node with ID missing is not part of the workflow graph'
    );
  });

  it('navigateToNextNode advances from current node', () => {
    workflowExecutionCursor.navigateToNextNode();
    expect(workflowExecutionCursor.nextNode).toEqual(expect.objectContaining({ id: 'node2' }));
  });

  it('navigateToAfterNode sets next after given id', () => {
    workflowExecutionCursor.navigateToAfterNode('node1');
    expect(workflowExecutionCursor.nextNode).toEqual(expect.objectContaining({ id: 'node2' }));
  });

  it('commitPendingNavigation promotes next to current', () => {
    workflowExecutionCursor.navigateToNode('node3');
    workflowExecutionCursor.commitPendingNavigation();
    expect(workflowExecutionCursor.currentNode).toEqual(expect.objectContaining({ id: 'node3' }));
  });

  it('defaults to first topological node when nodeId is omitted', () => {
    const entryCursor = new WorkflowExecutionCursor({ workflowExecutionGraph });
    expect(entryCursor.currentNode).toEqual(expect.objectContaining({ id: 'node1' }));
  });

  describe('captureError', () => {
    it('stores an Error instance directly', () => {
      const err = new Error('step failed');
      workflowExecutionCursor.captureError(err);
      expect(workflowExecutionCursor.error).toBe(err);
    });

    it('wraps a non-Error value in an Error with the stringified message', () => {
      workflowExecutionCursor.captureError('something went wrong');
      expect(workflowExecutionCursor.error).toBeInstanceOf(Error);
      expect(workflowExecutionCursor.error?.message).toBe('something went wrong');
    });

    it('wraps a non-Error object using String()', () => {
      workflowExecutionCursor.captureError({ code: 42 });
      expect(workflowExecutionCursor.error).toBeInstanceOf(Error);
      expect(workflowExecutionCursor.error?.message).toBe('[object Object]');
    });

    it('clearError removes a previously captured error', () => {
      workflowExecutionCursor.captureError(new Error('boom'));
      workflowExecutionCursor.clearError();
      expect(workflowExecutionCursor.error).toBeUndefined();
    });
  });
});

describe('WorkflowExecutionCursor synthetic scope', () => {
  const graphNodes: Record<string, GraphNodeUnion> = {
    'enter-owner': {
      id: 'enter-owner',
      stepId: 'owner',
      type: 'enter-scope',
      stepType: 'scope',
    } as GraphNodeUnion,
    body: { id: 'body', stepId: 'body', type: 'atomic', stepType: 'slack' } as GraphNodeUnion,
    'exit-owner': {
      id: 'exit-owner',
      stepId: 'owner',
      type: 'exit-scope',
      stepType: 'scope',
    } as GraphNodeUnion,
  };

  let workflowExecutionGraph: WorkflowGraph;
  let cursor: WorkflowExecutionCursor;

  beforeEach(() => {
    workflowExecutionGraph = {
      topologicalOrder: ['enter-owner', 'body', 'exit-owner'],
      getNode: jest.fn((nodeId: string) => graphNodes[nodeId]),
      getNodeStack: jest.fn((nodeId: string) => {
        if (nodeId === 'body') {
          return ['enter-owner'];
        }
        return [];
      }),
    } as unknown as WorkflowGraph;

    cursor = new WorkflowExecutionCursor({
      nodeId: 'enter-owner',
      workflowExecutionGraph,
    });
  });

  it('keeps currentNode on the compiled enter until commit', () => {
    cursor.navigateToSynthetic({
      stepId: 'a',
      nodeType: 'synthetic',
      nodeId: 'synthetic:a',
    });

    expect(cursor.currentNode).toEqual(expect.objectContaining({ id: 'enter-owner' }));
    expect(cursor.nextNode).toEqual(
      expect.objectContaining({ id: 'synthetic:a', type: 'synthetic', stepId: 'a' })
    );
    expect(cursor.currentStackFrames).toEqual([
      {
        stepId: 'owner',
        nestedScopes: [{ nodeId: 'enter-owner', nodeType: 'enter-scope' }],
      },
    ]);
  });

  it('sits on the synthetic node after commit without calling getNodeStack', () => {
    cursor.navigateToSynthetic({
      stepId: 'a',
      nodeType: 'synthetic',
      nodeId: 'synthetic:a',
    });
    cursor.commitPendingNavigation();

    expect(cursor.currentNode).toEqual(
      expect.objectContaining({ id: 'synthetic:a', type: 'synthetic' })
    );
    expect(workflowExecutionGraph.getNodeStack).not.toHaveBeenCalled();
    expect(cursor.currentStackFrames).toEqual([
      {
        stepId: 'owner',
        nestedScopes: [{ nodeId: 'enter-owner', nodeType: 'enter-scope' }],
      },
      {
        stepId: 'a',
        nestedScopes: [{ nodeId: 'synthetic:a', nodeType: 'synthetic', scopeId: 'a' }],
      },
    ]);
  });

  it('reattaches the synthetic frame when committing to a compiled body node', () => {
    cursor.navigateToSynthetic({
      stepId: 'a',
      nodeType: 'synthetic',
      nodeId: 'synthetic:a',
    });
    cursor.commitPendingNavigation();
    cursor.navigateToAfterNode('enter-owner');
    cursor.commitPendingNavigation();

    expect(cursor.currentNode).toEqual(expect.objectContaining({ id: 'body' }));
    expect(cursor.currentStackFrames).toEqual([
      {
        stepId: 'owner',
        nestedScopes: [{ nodeId: 'enter-owner', nodeType: 'enter-scope' }],
      },
      {
        stepId: 'a',
        nestedScopes: [{ nodeId: 'synthetic:a', nodeType: 'synthetic', scopeId: 'a' }],
      },
    ]);
  });

  it('hydrates a live synthetic from persisted stack frames on resume', () => {
    const resumed = new WorkflowExecutionCursor({
      nodeId: 'synthetic:a',
      stackFrames: [
        {
          stepId: 'owner',
          nestedScopes: [{ nodeId: 'enter-owner', nodeType: 'enter-scope' }],
        },
        {
          stepId: 'a',
          nestedScopes: [{ nodeId: 'synthetic:a', nodeType: 'synthetic', scopeId: 'a' }],
        },
      ],
      workflowExecutionGraph,
    });

    expect(resumed.currentNode).toEqual(
      expect.objectContaining({ id: 'synthetic:a', type: 'synthetic' })
    );
    expect(() => resumed.navigateToNode('synthetic:a')).not.toThrow();
  });
});
