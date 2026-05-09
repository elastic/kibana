/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import { WorkflowExecutionDriver } from '../workflow_execution_driver';
import type { WorkflowExecutionState } from '../workflow_execution_state';

describe('WorkflowExecutionDriver', () => {
  let driver: WorkflowExecutionDriver;
  let workflowExecution: EsWorkflowExecution;
  let workflowExecutionGraph: WorkflowGraph;
  let workflowExecutionState: WorkflowExecutionState;

  beforeEach(() => {
    workflowExecution = {
      id: 'exec1',
      currentNodeId: 'node1',
      scopeStack: [],
    } as EsWorkflowExecution;

    workflowExecutionGraph = {
      topologicalOrder: ['node1', 'node2', 'node3'],
      getNode: jest.fn().mockImplementation((nodeId: string) => {
        if (nodeId === 'node1') {
          return { id: 'node1', stepId: 's1', stepType: 't1' } as GraphNodeUnion;
        }
        if (nodeId === 'node2') {
          return { id: 'node2', stepId: 's2', stepType: 't2' } as GraphNodeUnion;
        }
        if (nodeId === 'node3') {
          return { id: 'node3', stepId: 's3', stepType: 't3' } as GraphNodeUnion;
        }
        return undefined;
      }),
    } as unknown as WorkflowGraph;

    workflowExecutionState = {
      getWorkflowExecution: jest.fn().mockReturnValue(workflowExecution),
    } as unknown as WorkflowExecutionState;

    driver = new WorkflowExecutionDriver({
      workflowExecutionState,
      workflowExecutionGraph,
    });
  });

  it('starts with isExecuting false', () => {
    expect(driver.isExecuting).toBe(false);
  });

  it('start sets isExecuting true', () => {
    driver.start();
    expect(driver.isExecuting).toBe(true);
  });

  it('stop clears isExecuting', () => {
    driver.start();
    driver.stop();
    expect(driver.isExecuting).toBe(false);
  });

  it('getCurrentNode and currentNode return graph node for persisted currentNodeId', () => {
    expect(driver.getCurrentNode()).toEqual(expect.objectContaining({ id: 'node1' }));
    expect(driver.currentNode).toEqual(expect.objectContaining({ id: 'node1' }));
  });

  it('navigateToNode sets pending next for saveState', () => {
    driver.navigateToNode('node3');
    expect(driver.getNextNodeId()).toBe('node3');
  });

  it('navigateToNode throws when node is missing', () => {
    (workflowExecutionGraph.getNode as jest.Mock).mockReturnValueOnce(undefined);
    expect(() => driver.navigateToNode('missing')).toThrow(
      'Node with ID missing is not part of the workflow graph'
    );
  });

  it('navigateToNextNode advances from persisted currentNodeId', () => {
    driver.navigateToNextNode();
    expect(driver.getNextNodeId()).toBe('node2');
  });

  it('navigateToAfterNode sets next after given id', () => {
    driver.navigateToAfterNode('node1');
    expect(driver.getNextNodeId()).toBe('node2');
  });

  it('setEntryNodeFromTopologicalOrder sets first node', () => {
    driver.setEntryNodeFromTopologicalOrder();
    expect(driver.getNextNodeId()).toBe('node1');
  });

  it('syncPendingNavigationFromPersistedCurrentNode copies currentNodeId', () => {
    (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
      ...workflowExecution,
      currentNodeId: 'node2',
    });
    driver.syncPendingNavigationFromPersistedCurrentNode();
    expect(driver.getNextNodeId()).toBe('node2');
  });
});
