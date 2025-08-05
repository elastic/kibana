/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowYaml, ForEachStep, ConnectorStep } from '@kbn/workflows';
import { convertToWorkflowGraph } from './build_execution_graph';
import { graphlib } from '@dagrejs/dagre';

describe('convertToWorkflowGraph', () => {
  describe('foreach step', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'testForeachStep',
          foreach: '["item1", "item2", "item3"]',
          type: 'foreach',
          steps: [
            {
              name: 'firstTestForeachConnectorStep',
              type: 'slack',
              connectorId: 'slack',
              with: {
                message: 'Hello from foreach nested step 1',
              },
            } as ConnectorStep,
            {
              name: 'secondTestForeachConnectorStep',
              type: 'openai',
              connectorId: 'openai',
              with: {
                message: 'Hello from foreach nested step 2',
              },
            } as ConnectorStep,
          ],
        } as ForEachStep,
      ],
    } as Partial<WorkflowYaml>;

    it('should have 4 nodes', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const nodesCount = executionGraph.nodeCount();
      expect(nodesCount).toBe(4);
      expect([...executionGraph.nodes()].toSorted()).toEqual(
        [
          'testForeachStep',
          'firstTestForeachConnectorStep',
          'secondTestForeachConnectorStep',
          'exitForeach(testForeachStep)',
        ].toSorted()
      );
    });

    it('should have enter foreach node correctly configured', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const enterForeachNode = executionGraph.node('testForeachStep');
      expect(enterForeachNode).toEqual({
        id: 'testForeachStep',
        type: 'enter-foreach',
        itemNodeIds: ['firstTestForeachConnectorStep', 'secondTestForeachConnectorStep'],
        configuration: {
          foreach: '["item1", "item2", "item3"]',
          name: 'testForeachStep',
          type: 'foreach',
        },
      });
    });

    it('should have exit foreach node correctly configured', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const exitForeachNode = executionGraph.node('exitForeach(testForeachStep)');
      expect(exitForeachNode).toEqual({
        type: 'exit-foreach',
        id: 'exitForeach(testForeachStep)',
        startNodeId: 'testForeachStep',
      });
    });

    it('should have foreach node as the root node', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const topSort = graphlib.alg.topsort(executionGraph);
      const rootNode = topSort[0];
      expect(rootNode).toBe('testForeachStep');
    });

    it('should have correct edges', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const edges = executionGraph.edges();
      expect(edges).toEqual([
        { v: 'testForeachStep', w: 'firstTestForeachConnectorStep' },
        { v: 'firstTestForeachConnectorStep', w: 'secondTestForeachConnectorStep' },
        { v: 'secondTestForeachConnectorStep', w: 'exitForeach(testForeachStep)' },
      ]);
    });
  });
});
