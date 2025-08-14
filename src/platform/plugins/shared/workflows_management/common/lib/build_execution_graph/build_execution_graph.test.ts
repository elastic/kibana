/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { graphlib } from '@dagrejs/dagre';
import {
  AtomicGraphNode,
  ConnectorStep,
  EnterConditionBranchNode,
  EnterForeachNode,
  EnterIfNode,
  ExitConditionBranchNode,
  ExitForeachNode,
  ExitIfNode,
  ForEachStep,
  IfStep,
  WorkflowYaml,
} from '@kbn/workflows';
import { convertToWorkflowGraph } from './build_execution_graph';

describe('convertToWorkflowGraph', () => {
  describe('atomic steps', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'testAtomicStep1',
          type: 'slack',
          connectorId: 'slack',
          with: {
            message: 'Hello from atomic step 1',
          },
        } as ConnectorStep,
        {
          name: 'testAtomicStep2',
          type: 'openai',
          connectorId: 'openai',
          with: {
            message: 'Hello from atomic step 2',
          },
        } as ConnectorStep,
      ],
    } as Partial<WorkflowYaml>;

    it('should return nodes for atomic step in correct topological order', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toHaveLength(2);
      expect(topSort).toEqual(['testAtomicStep1', 'testAtomicStep2']);
    });

    it('should return correct edges for atomic step graph', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const edges = executionGraph.edges();
      expect(edges).toEqual([{ v: 'testAtomicStep1', w: 'testAtomicStep2' }]);
    });

    it('should configure the atomic step correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const node = executionGraph.node('testAtomicStep1');
      expect(node).toEqual({
        id: 'testAtomicStep1',
        type: 'atomic',
        configuration: {
          name: 'testAtomicStep1',
          type: 'slack',
          connectorId: 'slack',
          with: { message: 'Hello from atomic step 1' },
        },
      } as AtomicGraphNode);
    });
  });

  describe('if step', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'testIfStep',
          type: 'if',
          condition: 'true',
          steps: [
            {
              name: 'firstThenTestConnectorStep',
              type: 'slack',
              connectorId: 'slack',
              with: {
                message: 'Hello from then step 1',
              },
            } as ConnectorStep,
            {
              name: 'secondThenTestConnectorStep',
              type: 'openai',
              connectorId: 'openai',
              with: {
                message: 'Hello from then nested step 2',
              },
            } as ConnectorStep,
          ],
          else: [
            {
              name: 'elseTestConnectorStep',
              type: 'slack',
              connectorId: 'slack',
              with: {
                message: 'Hello from else nested step',
              },
            } as ConnectorStep,
          ],
        } as IfStep,
      ],
    } as Partial<WorkflowYaml>;

    it('should return nodes for if condition in correct topological order', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toHaveLength(9);
      expect(topSort).toEqual([
        'testIfStep',
        'enterThen(testIfStep)',
        'firstThenTestConnectorStep',
        'secondThenTestConnectorStep',
        'exitThen(testIfStep)',
        'enterElse(testIfStep)',
        'elseTestConnectorStep',
        'exitElse(testIfStep)',
        'exitCondition(testIfStep)',
      ]);
    });

    it('should return correct edges for if step graph', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const edges = executionGraph.edges();
      expect(edges).toEqual(
        expect.arrayContaining([
          { v: 'testIfStep', w: 'enterThen(testIfStep)' },
          { v: 'enterThen(testIfStep)', w: 'firstThenTestConnectorStep' },
          { v: 'firstThenTestConnectorStep', w: 'secondThenTestConnectorStep' },
          { v: 'secondThenTestConnectorStep', w: 'exitThen(testIfStep)' },
          { v: 'testIfStep', w: 'enterElse(testIfStep)' },
          { v: 'enterElse(testIfStep)', w: 'elseTestConnectorStep' },
          { v: 'elseTestConnectorStep', w: 'exitElse(testIfStep)' },
          { v: 'exitThen(testIfStep)', w: 'exitCondition(testIfStep)' },
          { v: 'exitElse(testIfStep)', w: 'exitCondition(testIfStep)' },
        ])
      );
      expect(edges).toHaveLength(9);
    });

    it('should configure enter-if node correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const enterIfNode = executionGraph.node('testIfStep');
      expect(enterIfNode).toEqual({
        id: 'testIfStep',
        type: 'enter-if',
        exitNodeId: 'exitCondition(testIfStep)',
        configuration: {
          name: 'testIfStep',
          type: 'if',
          condition: 'true',
        },
      } as EnterIfNode);
    });

    it('should configure enter-then branch node correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const enterThenBranchNode = executionGraph.node('enterThen(testIfStep)');
      expect(enterThenBranchNode).toEqual({
        id: 'enterThen(testIfStep)',
        type: 'enter-condition-branch',
        condition: 'true',
      } as EnterConditionBranchNode);
    });

    it('should configure exit-then branch node correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const exitThenBranchNode = executionGraph.node('exitThen(testIfStep)');
      expect(exitThenBranchNode).toEqual({
        id: 'exitThen(testIfStep)',
        type: 'exit-condition-branch',
        startNodeId: 'enterThen(testIfStep)',
      } as ExitConditionBranchNode);
    });

    it('should configure enter-else branch node correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const enterElseBranchNode = executionGraph.node('enterElse(testIfStep)');
      expect(enterElseBranchNode).toEqual({
        id: 'enterElse(testIfStep)',
        type: 'enter-condition-branch',
        condition: undefined,
      } as EnterConditionBranchNode);
    });

    it('should configure exit-else branch node correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const exitElseBranchNode = executionGraph.node('exitElse(testIfStep)');
      expect(exitElseBranchNode).toEqual({
        id: 'exitElse(testIfStep)',
        type: 'exit-condition-branch',
        startNodeId: 'enterElse(testIfStep)',
      } as ExitConditionBranchNode);
    });

    it('should configure exit-if node correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const exitConditionNode = executionGraph.node('exitCondition(testIfStep)');
      expect(exitConditionNode).toEqual({
        id: 'exitCondition(testIfStep)',
        type: 'exit-if',
        startNodeId: 'testIfStep',
      } as ExitIfNode);
    });

    describe('if step without else branch', () => {
      const workflowDefinitionWithoutElse = {
        steps: [
          {
            name: 'testIfStepWithoutElse',
            type: 'if',
            condition: 'true',
            steps: [
              {
                name: 'thenTestConnectorStep',
                type: 'slack',
                connectorId: 'slack',
                with: {
                  message: 'Hello from then step',
                },
              } as ConnectorStep,
            ],
          } as IfStep,
        ],
      } as Partial<WorkflowYaml>;

      it('should handle if step without else branch correctly', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinitionWithoutElse as any);
        const topSort = graphlib.alg.topsort(executionGraph);
        expect(topSort).toHaveLength(5);
        expect(topSort).toEqual([
          'testIfStepWithoutElse',
          'enterThen(testIfStepWithoutElse)',
          'thenTestConnectorStep',
          'exitThen(testIfStepWithoutElse)',
          'exitCondition(testIfStepWithoutElse)',
        ]);
      });
    });
  });

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

    it('should return nodes for foreach step in correct topological order', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toHaveLength(4);
      expect(topSort).toEqual([
        'testForeachStep',
        'firstTestForeachConnectorStep',
        'secondTestForeachConnectorStep',
        'exitForeach(testForeachStep)',
      ]);
    });

    it('should return correct edges for foreach step graph', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const edges = executionGraph.edges();
      expect(edges).toEqual(
        expect.arrayContaining([
          { v: 'testForeachStep', w: 'firstTestForeachConnectorStep' },
          { v: 'firstTestForeachConnectorStep', w: 'secondTestForeachConnectorStep' },
          { v: 'secondTestForeachConnectorStep', w: 'exitForeach(testForeachStep)' },
        ])
      );
      expect(edges).toHaveLength(3);
    });

    it('should configure enter-foreach node correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const enterForeachNode = executionGraph.node('testForeachStep');
      expect(enterForeachNode).toEqual({
        id: 'testForeachStep',
        type: 'enter-foreach',
        exitNodeId: 'exitForeach(testForeachStep)',
        itemNodeIds: ['firstTestForeachConnectorStep', 'secondTestForeachConnectorStep'],
        configuration: {
          foreach: '["item1", "item2", "item3"]',
          name: 'testForeachStep',
          type: 'foreach',
        },
      } as EnterForeachNode);
    });

    it('should configure exit-foreach node correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const exitForeachNode = executionGraph.node('exitForeach(testForeachStep)');
      expect(exitForeachNode).toEqual({
        type: 'exit-foreach',
        id: 'exitForeach(testForeachStep)',
        startNodeId: 'testForeachStep',
      } as ExitForeachNode);
    });

    describe('nested foreach steps', () => {
      const nestedWorkflowDefinition = {
        steps: [
          {
            name: 'outerForeachStep',
            foreach: '["outer1", "outer2"]',
            type: 'foreach',
            steps: [
              {
                name: 'innerForeachStep',
                foreach: '["inner1", "inner2"]',
                type: 'foreach',
                steps: [
                  {
                    name: 'nestedConnectorStep',
                    type: 'slack',
                    connectorId: 'slack',
                    with: {
                      message: 'Hello from nested step',
                    },
                  } as ConnectorStep,
                ],
              } as ForEachStep,
            ],
          } as ForEachStep,
        ],
      } as Partial<WorkflowYaml>;

      it('should handle nested foreach steps correctly', () => {
        const executionGraph = convertToWorkflowGraph(nestedWorkflowDefinition as any);
        const topSort = graphlib.alg.topsort(executionGraph);
        expect(topSort).toHaveLength(5);
        expect(topSort).toEqual([
          'outerForeachStep',
          'innerForeachStep',
          'nestedConnectorStep',
          'exitForeach(innerForeachStep)',
          'exitForeach(outerForeachStep)',
        ]);
      });
    });
  });

  describe('complex workflow', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'firstConnectorStep',
          type: 'slack',
          connectorId: 'slack',
          with: {
            message: 'Hello from first step',
          },
        } as ConnectorStep,
        {
          name: 'testForeachStep',
          foreach: '["item1", "item2", "item3"]',
          type: 'foreach',
          steps: [
            {
              name: 'testIfStep',
              type: 'if',
              condition: 'true',
              steps: [
                {
                  name: 'firstThenTestConnectorStep',
                  type: 'slack',
                  connectorId: 'slack',
                  with: {
                    message: 'Hello from then step 1',
                  },
                } as ConnectorStep,
                {
                  name: 'secondThenTestConnectorStep',
                  type: 'openai',
                  connectorId: 'openai',
                  with: {
                    message: 'Hello from then nested step 2',
                  },
                } as ConnectorStep,
              ],
              else: [
                {
                  name: 'elseTestConnectorStep',
                  type: 'slack',
                  connectorId: 'slack',
                  with: {
                    message: 'Hello from else nested step',
                  },
                } as ConnectorStep,
              ],
            } as IfStep,
          ],
        } as ForEachStep,
      ],
    } as Partial<WorkflowYaml>;

    it('should have correctly structured graph for complex nodes', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const topsort = graphlib.alg.topsort(executionGraph);
      const expectedComplexOrder = [
        'firstConnectorStep',
        'testForeachStep',
        'testIfStep',
        'enterThen(testIfStep)',
        'firstThenTestConnectorStep',
        'secondThenTestConnectorStep',
        'exitThen(testIfStep)',
        'enterElse(testIfStep)',
        'elseTestConnectorStep',
        'exitElse(testIfStep)',
        'exitCondition(testIfStep)',
        'exitForeach(testForeachStep)',
      ];
      expect(topsort).toEqual(expectedComplexOrder);
    });
  });
});
