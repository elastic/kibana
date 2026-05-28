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
});
