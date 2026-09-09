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

  const getNodeStack = (nodeId: string) => {
    if (!graphNodes[nodeId]) {
      throw new Error(`Node not found for node id: ${nodeId}`);
    }
    if (nodeId === 'body') {
      return ['enter-owner'];
    }
    return [];
  };

  beforeEach(() => {
    workflowExecutionGraph = {
      topologicalOrder: ['enter-owner', 'body', 'exit-owner'],
      getNode: jest.fn((nodeId: string) => graphNodes[nodeId]),
      getNodeStack: jest.fn(getNodeStack),
    } as unknown as WorkflowGraph;

    cursor = new WorkflowExecutionCursor({
      nodeId: 'enter-owner',
      workflowExecutionGraph,
    });
  });

  const mintSynthetic = () => {
    cursor.navigateToSynthetic({
      stepId: 'a',
      nodeType: 'synthetic',
      nodeId: 'synthetic:a',
    });
  };

  it('keeps currentNode on the compiled enter until commit', () => {
    mintSynthetic();

    expect(cursor.currentNode).toEqual(expect.objectContaining({ id: 'enter-owner' }));
    expect(cursor.nextNode).toBeNull();
  });

  it('sits on the prefixed synthetic after commit and rebuilds the stack from the owner', () => {
    mintSynthetic();
    cursor.commitPendingNavigation();

    expect(cursor.currentNode).toEqual(
      expect.objectContaining({
        id: 'enter-synthetic-synthetic:a',
        type: 'enter-synthetic',
        stepId: 'a',
      })
    );
    expect(workflowExecutionGraph.getNodeStack).toHaveBeenCalledWith('enter-owner');
    expect(workflowExecutionGraph.getNodeStack).not.toHaveBeenCalledWith(
      'enter-synthetic-synthetic:a'
    );
    expect(cursor.currentStackFrames).toEqual([
      {
        stepId: 'owner',
        nestedScopes: [{ nodeId: 'enter-owner', nodeType: 'enter-scope' }],
      },
      {
        stepId: 'a',
        nestedScopes: [{ nodeId: 'enter-synthetic-synthetic:a', nodeType: 'enter-synthetic', scopeId: 'a' }],
      },
    ]);
  });

  it('advances from the synthetic enter to the node after the owner', () => {
    mintSynthetic();
    cursor.commitPendingNavigation();
    cursor.navigateToNextNode();

    expect(cursor.nextNode).toEqual(expect.objectContaining({ id: 'body' }));
  });

  it('reattaches the synthetic frame when committing to a compiled body node', () => {
    mintSynthetic();
    cursor.commitPendingNavigation();
    cursor.navigateToNextNode();
    cursor.commitPendingNavigation();

    expect(cursor.currentNode).toEqual(expect.objectContaining({ id: 'body' }));
    expect(cursor.currentStackFrames).toEqual([
      {
        stepId: 'owner',
        nestedScopes: [{ nodeId: 'enter-owner', nodeType: 'enter-scope' }],
      },
      {
        stepId: 'a',
        nestedScopes: [{ nodeId: 'enter-synthetic-synthetic:a', nodeType: 'enter-synthetic', scopeId: 'a' }],
      },
    ]);
  });

  it('resumes a compiled owner from the graph even when a synthetic is open', () => {
    const resumed = new WorkflowExecutionCursor({
      nodeId: 'enter-owner',
      stackFrames: [
        {
          stepId: 'owner',
          nestedScopes: [{ nodeId: 'enter-owner', nodeType: 'enter-scope' }],
        },
        {
          stepId: 'a',
          nestedScopes: [{ nodeId: 'enter-synthetic-synthetic:a', nodeType: 'enter-synthetic', scopeId: 'a' }],
        },
      ],
      workflowExecutionGraph,
    });

    expect(resumed.currentNode).toEqual(expect.objectContaining({ id: 'enter-owner' }));
  });

  it('hydrates a live synthetic from persisted stack frames on resume', () => {
    const resumed = new WorkflowExecutionCursor({
      nodeId: 'enter-synthetic-synthetic:a',
      stackFrames: [
        {
          stepId: 'owner',
          nestedScopes: [{ nodeId: 'enter-owner', nodeType: 'enter-scope' }],
        },
        {
          stepId: 'a',
          nestedScopes: [{ nodeId: 'enter-synthetic-synthetic:a', nodeType: 'enter-synthetic', scopeId: 'a' }],
        },
      ],
      workflowExecutionGraph,
    });

    expect(resumed.currentNode).toEqual(
      expect.objectContaining({ id: 'enter-synthetic-synthetic:a', type: 'enter-synthetic' })
    );
    expect(resumed.currentStackFrames).toEqual([
      {
        stepId: 'owner',
        nestedScopes: [{ nodeId: 'enter-owner', nodeType: 'enter-scope' }],
      },
      {
        stepId: 'a',
        nestedScopes: [{ nodeId: 'enter-synthetic-synthetic:a', nodeType: 'enter-synthetic', scopeId: 'a' }],
      },
    ]);
  });
});

describe('WorkflowExecutionCursor synthetic enter/exit pair', () => {
  const graphNodes: Record<string, GraphNodeUnion> = {
    'enter-foreach': {
      id: 'enter-foreach',
      stepId: 'loop',
      type: 'enter-foreach',
      stepType: 'foreach',
    } as GraphNodeUnion,
    body: { id: 'body', stepId: 'console', type: 'atomic', stepType: 'console' } as GraphNodeUnion,
    'exit-foreach': {
      id: 'exit-foreach',
      stepId: 'loop',
      type: 'exit-foreach',
      stepType: 'foreach',
    } as GraphNodeUnion,
  };

  let workflowExecutionGraph: WorkflowGraph;
  let cursor: WorkflowExecutionCursor;

  beforeEach(() => {
    workflowExecutionGraph = {
      topologicalOrder: ['enter-foreach', 'body', 'exit-foreach'],
      getNode: jest.fn((nodeId: string) => graphNodes[nodeId]),
      getNodeStack: jest.fn((nodeId: string) => {
        if (!graphNodes[nodeId]) {
          throw new Error(`Node not found for node id: ${nodeId}`);
        }
        if (nodeId === 'body') {
          return ['enter-foreach'];
        }
        return [];
      }),
    } as unknown as WorkflowGraph;

    cursor = new WorkflowExecutionCursor({
      nodeId: 'enter-foreach',
      workflowExecutionGraph,
    });
  });

  const mintIteration = () => {
    cursor.navigateToSynthetic({
      stepId: '0',
      nodeType: 'iteration',
      nodeId: 'iteration:0',
      stepType: 'iteration',
    });
    cursor.commitPendingNavigation();
  };

  it('keeps body navigation inside the open iteration', () => {
    mintIteration();
    cursor.navigateToNextNode();
    cursor.commitPendingNavigation();

    expect(cursor.currentNode).toEqual(expect.objectContaining({ id: 'body' }));
    expect(cursor.currentStackFrames).toEqual([
      {
        stepId: 'loop',
        nestedScopes: [{ nodeId: 'enter-foreach', nodeType: 'enter-foreach' }],
      },
      {
        stepId: '0',
        nestedScopes: [
          { nodeId: 'enter-synthetic-iteration:0', nodeType: 'enter-iteration', scopeId: '0' },
        ],
      },
    ]);
  });

  it('visits the paired synthetic exit before the compiled owner exit', () => {
    mintIteration();
    cursor.navigateToNextNode();
    cursor.commitPendingNavigation();
    cursor.navigateToNextNode();
    cursor.commitPendingNavigation();

    expect(cursor.currentNode).toEqual(
      expect.objectContaining({
        id: 'exit-synthetic-iteration:0',
        type: 'exit-iteration',
        stepId: '0',
        stepType: 'iteration',
      })
    );
    expect(cursor.currentStackFrames).toEqual([
      {
        stepId: 'loop',
        nestedScopes: [{ nodeId: 'enter-foreach', nodeType: 'enter-foreach' }],
      },
    ]);
  });

  it('keys the minted synthetic as enter-synthetic-iteration so navigateToNode can resolve it', () => {
    cursor.navigateToSynthetic({
      stepId: '0',
      nodeType: 'iteration',
      nodeId: 'iteration:0',
      stepType: 'iteration',
    });

    expect(() => cursor.navigateToNode('enter-synthetic-iteration:0')).not.toThrow();
    expect(cursor.nextNode).toEqual(
      expect.objectContaining({ id: 'enter-synthetic-iteration:0', type: 'enter-iteration' })
    );
  });

  it('resolves a synthetic id through navigateToNode', () => {
    mintIteration();

    expect(() => cursor.navigateToNode('enter-synthetic-iteration:0')).not.toThrow();
    expect(cursor.nextNode).toEqual(
      expect.objectContaining({ id: 'enter-synthetic-iteration:0', type: 'enter-iteration' })
    );
  });

  it('commits from enter-synthetic-iteration with next unset to the node after the owner', () => {
    mintIteration();

    expect(cursor.nextNode).toBeNull();
    cursor.commitPendingNavigation();

    expect(cursor.currentNode).toEqual(expect.objectContaining({ id: 'body' }));
  });

  it('continues from the synthetic exit to the compiled owner exit', () => {
    mintIteration();
    cursor.navigateToNextNode();
    cursor.commitPendingNavigation();
    cursor.navigateToNextNode();
    cursor.commitPendingNavigation();
    cursor.navigateToNextNode();

    expect(cursor.nextNode).toEqual(expect.objectContaining({ id: 'exit-foreach' }));
  });

  it('commits from exit-synthetic-iteration with next unset to the compiled owner exit and drops the synthetic', () => {
    mintIteration();
    cursor.navigateToNextNode();
    cursor.commitPendingNavigation();
    cursor.navigateToNextNode();
    cursor.commitPendingNavigation();

    expect(cursor.currentNode).toEqual(expect.objectContaining({ id: 'exit-synthetic-iteration:0' }));
    expect(cursor.nextNode).toBeNull();

    cursor.commitPendingNavigation();

    expect(cursor.currentNode).toEqual(expect.objectContaining({ id: 'exit-foreach' }));
    expect(() => cursor.navigateToNode('enter-synthetic-iteration:0')).toThrow(
      'Node with ID enter-synthetic-iteration:0 is not part of the workflow graph'
    );
    expect(() => cursor.navigateToNode('exit-synthetic-iteration:0')).toThrow(
      'Node with ID exit-synthetic-iteration:0 is not part of the workflow graph'
    );
  });
});

describe('WorkflowExecutionCursor synthetic ownership uses compiled type not id prefix', () => {
  const graphNodes: Record<string, GraphNodeUnion> = {
    enterForeach_loop: {
      id: 'enterForeach_loop',
      stepId: 'loop',
      type: 'enter-foreach',
      stepType: 'foreach',
      exitNodeId: 'exitForeach_loop',
    } as GraphNodeUnion,
    body: { id: 'body', stepId: 'console', type: 'atomic', stepType: 'console' } as GraphNodeUnion,
    exitForeach_loop: {
      id: 'exitForeach_loop',
      stepId: 'loop',
      type: 'exit-foreach',
      stepType: 'foreach',
      startNodeId: 'enterForeach_loop',
    } as GraphNodeUnion,
  };

  it('mints and leaves through the pair when compiled ids are camelCase', () => {
    const workflowExecutionGraph = {
      topologicalOrder: ['enterForeach_loop', 'body', 'exitForeach_loop'],
      getNode: jest.fn((nodeId: string) => graphNodes[nodeId]),
      getNodeStack: jest.fn((nodeId: string) => {
        if (!graphNodes[nodeId]) {
          throw new Error(`Node not found for node id: ${nodeId}`);
        }
        if (nodeId === 'body') {
          return ['enterForeach_loop'];
        }
        return [];
      }),
    } as unknown as WorkflowGraph;

    const cursor = new WorkflowExecutionCursor({
      nodeId: 'enterForeach_loop',
      workflowExecutionGraph,
    });

    cursor.navigateToSynthetic({
      stepId: '0',
      nodeType: 'iteration',
      nodeId: 'iteration:0',
      stepType: 'iteration',
    });
    cursor.commitPendingNavigation();

    expect(cursor.currentNode).toEqual(
      expect.objectContaining({ id: 'enter-synthetic-iteration:0', type: 'enter-iteration' })
    );

    cursor.navigateToNextNode();
    cursor.commitPendingNavigation();
    cursor.navigateToNextNode();
    cursor.commitPendingNavigation();

    expect(cursor.currentNode).toEqual(
      expect.objectContaining({ id: 'exit-synthetic-iteration:0', type: 'exit-iteration' })
    );

    cursor.navigateToNextNode();
    expect(cursor.nextNode).toEqual(expect.objectContaining({ id: 'exitForeach_loop' }));
  });
});
