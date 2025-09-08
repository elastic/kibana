/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { graphlib } from '@dagrejs/dagre';
import type {
  ConnectorStep,
  ForEachStep,
  HttpStep,
  IfStep,
  WaitStep,
  WorkflowYaml,
} from '../../../spec/schema';
import type {
  AtomicGraphNode,
  EnterConditionBranchNode,
  EnterForeachNode,
  EnterIfNode,
  ExitConditionBranchNode,
  ExitForeachNode,
  ExitIfNode,
  HttpGraphNode,
  WaitGraphNode,
} from '../../../types/execution';
import { convertToWorkflowGraph } from '../build_execution_graph';

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

  describe('wait step', () => {
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
          name: 'testWaitStep',
          type: 'wait',
          with: {
            duration: '1s',
          },
        } as WaitStep,
        {
          name: 'testAtomicStep2',
          type: 'slack',
          connectorId: 'slack',
          with: {
            message: 'Hello from atomic step 2',
          },
        } as ConnectorStep,
      ],
    } as Partial<WorkflowYaml>;

    it('should return nodes for wait step in correct topological order', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toHaveLength(3);
      expect(topSort).toEqual(['testAtomicStep1', 'testWaitStep', 'testAtomicStep2']);
    });

    it('should return correct edges for wait step graph', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const edges = executionGraph.edges();
      expect(edges).toEqual([
        { v: 'testAtomicStep1', w: 'testWaitStep' },
        { v: 'testWaitStep', w: 'testAtomicStep2' },
      ]);
    });

    it('should configure the wait step correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const node = executionGraph.node('testWaitStep');
      expect(node).toEqual({
        id: 'testWaitStep',
        type: 'wait',
        configuration: {
          name: 'testWaitStep',
          type: 'wait',
          with: { duration: '1s' },
        },
      } as WaitGraphNode);
    });
  });

  describe('http step', () => {
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
          name: 'testHttpStep',
          type: 'http',
          with: {
            url: 'https://api.example.com/test',
            method: 'GET',
            headers: {
              Authorization: 'Bearer token',
            },
            timeout: '30s',
          },
        } as HttpStep,
        {
          name: 'testAtomicStep2',
          type: 'slack',
          connectorId: 'slack',
          with: {
            message: 'Hello from atomic step 2',
          },
        } as ConnectorStep,
      ],
    } as Partial<WorkflowYaml>;

    it('should return nodes for http step in correct topological order', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toHaveLength(3);
      expect(topSort).toEqual(['testAtomicStep1', 'testHttpStep', 'testAtomicStep2']);
    });

    it('should return correct edges for http step graph', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const edges = executionGraph.edges();
      expect(edges).toEqual([
        { v: 'testAtomicStep1', w: 'testHttpStep' },
        { v: 'testHttpStep', w: 'testAtomicStep2' },
      ]);
    });

    it('should configure the http step correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const node = executionGraph.node('testHttpStep');
      expect(node).toEqual({
        id: 'testHttpStep',
        type: 'http',
        configuration: {
          name: 'testHttpStep',
          type: 'http',
          with: {
            url: 'https://api.example.com/test',
            method: 'GET',
            headers: {
              Authorization: 'Bearer token',
            },
            timeout: '30s',
          },
        },
      } as HttpGraphNode);
    });
  });

  describe('if step', () => {
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
          name: 'testWaitStep',
          type: 'wait',
          with: {
            duration: '1s',
          },
        } as WaitStep,
        {
          name: 'testAtomicStep2',
          type: 'slack',
          connectorId: 'slack',
          with: {
            message: 'Hello from atomic step 2',
          },
        } as ConnectorStep,
      ],
    } as Partial<WorkflowYaml>;

    it('should return nodes for wait step in correct topological order', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toHaveLength(3);
      expect(topSort).toEqual(['testAtomicStep1', 'testWaitStep', 'testAtomicStep2']);
    });

    it('should return correct edges for wait step graph', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const edges = executionGraph.edges();
      expect(edges).toEqual([
        { v: 'testAtomicStep1', w: 'testWaitStep' },
        { v: 'testWaitStep', w: 'testAtomicStep2' },
      ]);
    });

    it('should configure the wait step correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const node = executionGraph.node('testWaitStep');
      expect(node).toEqual({
        id: 'testWaitStep',
        type: 'wait',
        configuration: {
          name: 'testWaitStep',
          type: 'wait',
          with: { duration: '1s' },
        },
      } as WaitGraphNode);
    });
  });

  describe('if condition', () => {
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
          type: 'enter-then-branch',
          condition: 'true',
        } as EnterConditionBranchNode);
      });

      it('should configure exit-then branch node correctly', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const exitThenBranchNode = executionGraph.node('exitThen(testIfStep)');
        expect(exitThenBranchNode).toEqual({
          id: 'exitThen(testIfStep)',
          type: 'exit-then-branch',
          startNodeId: 'enterThen(testIfStep)',
        } as ExitConditionBranchNode);
      });

      it('should configure enter-else branch node correctly', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const enterElseBranchNode = executionGraph.node('enterElse(testIfStep)');
        expect(enterElseBranchNode).toEqual({
          id: 'enterElse(testIfStep)',
          type: 'enter-else-branch',
          condition: undefined,
        } as EnterConditionBranchNode);
      });

      it('should configure exit-else branch node correctly', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const exitElseBranchNode = executionGraph.node('exitElse(testIfStep)');
        expect(exitElseBranchNode).toEqual({
          id: 'exitElse(testIfStep)',
          type: 'exit-else-branch',
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

    describe('step level if condition', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'firstThenTestConnectorStep',
            type: 'slack',
            connectorId: 'slack',
            if: 'false',
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
      } as Partial<WorkflowYaml>;

      it('should turn step with if condition into if graph node and return nodes in correct topological order', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const topSort = graphlib.alg.topsort(executionGraph);
        expect(topSort).toHaveLength(6);
        expect(topSort).toEqual([
          'if_firstThenTestConnectorStep',
          'enterThen(if_firstThenTestConnectorStep)',
          'firstThenTestConnectorStep',
          'exitThen(if_firstThenTestConnectorStep)',
          'exitCondition(if_firstThenTestConnectorStep)',
          'secondThenTestConnectorStep',
        ]);
      });

      it('should return correct edges for if step graph', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const edges = executionGraph.edges();
        expect(edges).toEqual(
          expect.arrayContaining([
            {
              v: 'if_firstThenTestConnectorStep',
              w: 'enterThen(if_firstThenTestConnectorStep)',
            },
            {
              v: 'enterThen(if_firstThenTestConnectorStep)',
              w: 'firstThenTestConnectorStep',
            },
            {
              v: 'firstThenTestConnectorStep',
              w: 'exitThen(if_firstThenTestConnectorStep)',
            },
            {
              v: 'exitThen(if_firstThenTestConnectorStep)',
              w: 'exitCondition(if_firstThenTestConnectorStep)',
            },
            {
              v: 'exitCondition(if_firstThenTestConnectorStep)',
              w: 'secondThenTestConnectorStep',
            },
          ])
        );
        expect(edges).toHaveLength(5);
      });

      it('should configure enter-if node correctly', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const enterIfNode = executionGraph.node('if_firstThenTestConnectorStep');
        expect(enterIfNode).toEqual({
          id: 'if_firstThenTestConnectorStep',
          type: 'enter-if',
          exitNodeId: 'exitCondition(if_firstThenTestConnectorStep)',
          configuration: {
            name: 'if_firstThenTestConnectorStep',
            type: 'if',
            condition: 'false',
          },
        } as EnterIfNode);
      });

      it('should configure enter-then branch node correctly', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const enterThenBranchNode = executionGraph.node('enterThen(if_firstThenTestConnectorStep)');
        expect(enterThenBranchNode).toEqual({
          id: 'enterThen(if_firstThenTestConnectorStep)',
          type: 'enter-then-branch',
          condition: 'false',
        } as EnterConditionBranchNode);
      });

      it('should not include if condition to the step inside if step', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const innerStep = executionGraph.node(
          'firstThenTestConnectorStep'
        ) as unknown as AtomicGraphNode;
        expect((innerStep.configuration as ConnectorStep).if).toBeUndefined();
      });

      it('should configure exit-then branch node correctly', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const exitThenBranchNode = executionGraph.node('exitThen(if_firstThenTestConnectorStep)');
        expect(exitThenBranchNode).toEqual({
          id: 'exitThen(if_firstThenTestConnectorStep)',
          type: 'exit-then-branch',
          startNodeId: 'enterThen(if_firstThenTestConnectorStep)',
        } as ExitConditionBranchNode);
      });

      it('should configure exit-if node correctly', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const exitConditionNode = executionGraph.node(
          'exitCondition(if_firstThenTestConnectorStep)'
        );
        expect(exitConditionNode).toEqual({
          id: 'exitCondition(if_firstThenTestConnectorStep)',
          type: 'exit-if',
          startNodeId: 'if_firstThenTestConnectorStep',
        } as ExitIfNode);
      });
    });
  });

  describe('foreach', () => {
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

        it('should have correct edges', () => {
          const executionGraph = convertToWorkflowGraph(nestedWorkflowDefinition as any);
          const edges = executionGraph.edges();
          expect(edges).toEqual(
            expect.arrayContaining([
              { v: 'outerForeachStep', w: 'innerForeachStep' },
              { v: 'innerForeachStep', w: 'nestedConnectorStep' },
              { v: 'nestedConnectorStep', w: 'exitForeach(innerForeachStep)' },
              { v: 'exitForeach(innerForeachStep)', w: 'exitForeach(outerForeachStep)' },
            ])
          );
          expect(edges).toHaveLength(4);
        });

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

    describe('step level foreach', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'testForeachConnectorStep',
            type: 'slack',
            connectorId: 'slack',
            foreach: '["item1", "item2", "item3"]',
            with: {
              message: 'Hello from foreach nested step 1',
            },
          } as ConnectorStep,
          {
            name: 'secondConnectorStep',
            type: 'openai',
            connectorId: 'openai',
            with: {
              message: 'Hello from foreach nested step 2',
            },
          } as ConnectorStep,
        ],
      } as Partial<WorkflowYaml>;

      it('should turn step with foreach into foreach graph node and return nodes for foreach step in correct topological order', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const topSort = graphlib.alg.topsort(executionGraph);
        expect(topSort).toHaveLength(4);
        expect(topSort).toEqual([
          'foreach_testForeachConnectorStep',
          'testForeachConnectorStep',
          'exitForeach(foreach_testForeachConnectorStep)',
          'secondConnectorStep',
        ]);
      });

      it('should return correct edges for foreach step graph', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const edges = executionGraph.edges();
        expect(edges).toEqual(
          expect.arrayContaining([
            { v: 'foreach_testForeachConnectorStep', w: 'testForeachConnectorStep' },
            { v: 'testForeachConnectorStep', w: 'exitForeach(foreach_testForeachConnectorStep)' },
            { v: 'exitForeach(foreach_testForeachConnectorStep)', w: 'secondConnectorStep' },
          ])
        );
        expect(edges).toHaveLength(3);
      });

      it('should configure enter-foreach node correctly', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const enterForeachNode = executionGraph.node('foreach_testForeachConnectorStep');
        expect(enterForeachNode).toEqual({
          id: 'foreach_testForeachConnectorStep',
          type: 'enter-foreach',
          exitNodeId: 'exitForeach(foreach_testForeachConnectorStep)',
          configuration: {
            foreach: '["item1", "item2", "item3"]',
            name: 'foreach_testForeachConnectorStep',
            type: 'foreach',
          },
        } as EnterForeachNode);
      });

      it('should not include foreach to the step inside foreach step', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const innerStep = executionGraph.node(
          'testForeachConnectorStep'
        ) as unknown as AtomicGraphNode;
        expect((innerStep.configuration as ConnectorStep).foreach).toBeUndefined();
      });

      it('should configure exit-foreach node correctly', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const exitForeachNode = executionGraph.node(
          'exitForeach(foreach_testForeachConnectorStep)'
        );
        expect(exitForeachNode).toEqual({
          type: 'exit-foreach',
          id: 'exitForeach(foreach_testForeachConnectorStep)',
          startNodeId: 'foreach_testForeachConnectorStep',
        } as ExitForeachNode);
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

  describe('step with foreach and if condition', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'testForeachConnectorStep',
          type: 'slack',
          connectorId: 'slack',
          if: 'false',
          foreach: '["item1", "item2", "item3"]',
          with: {
            message: 'Hello from foreach nested step 1',
          },
        } as ConnectorStep,
      ],
    } as Partial<WorkflowYaml>;

    it('should have foreach step on top of if step in topological order', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const topsort = graphlib.alg.topsort(executionGraph);
      expect(topsort).toHaveLength(7);
      expect(topsort).toEqual([
        'if_testForeachConnectorStep',
        'enterThen(if_testForeachConnectorStep)',
        'foreach_testForeachConnectorStep',
        'testForeachConnectorStep',
        'exitForeach(foreach_testForeachConnectorStep)',
        'exitThen(if_testForeachConnectorStep)',
        'exitCondition(if_testForeachConnectorStep)',
      ]);
    });

    it('should have correct edges', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const edges = executionGraph.edges();
      expect(edges).toEqual(
        expect.arrayContaining([
          { v: 'if_testForeachConnectorStep', w: 'enterThen(if_testForeachConnectorStep)' },
          { v: 'enterThen(if_testForeachConnectorStep)', w: 'foreach_testForeachConnectorStep' },
          { v: 'foreach_testForeachConnectorStep', w: 'testForeachConnectorStep' },
          {
            v: 'testForeachConnectorStep',
            w: 'exitForeach(foreach_testForeachConnectorStep)',
          },
          {
            v: 'exitForeach(foreach_testForeachConnectorStep)',
            w: 'exitThen(if_testForeachConnectorStep)',
          },
          {
            v: 'exitThen(if_testForeachConnectorStep)',
            w: 'exitCondition(if_testForeachConnectorStep)',
          },
        ])
      );
      expect(edges).toHaveLength(6);
    });
  });

  describe('step level foreach in if step', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'testIfStep',
          type: 'if',
          condition: 'true',
          steps: [
            {
              name: 'testForeachConnectorStep',
              type: 'slack',
              connectorId: 'slack',
              foreach: '["item1", "item2", "item3"]',
              with: {
                message: 'Hello from foreach nested step 1',
              },
            } as ConnectorStep,
          ],
        } as IfStep,
      ],
    } as Partial<WorkflowYaml>;

    it('should have foreach step on top of if step in topological order', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const topsort = graphlib.alg.topsort(executionGraph);
      expect(topsort).toHaveLength(7);
      expect(topsort).toEqual([
        'testIfStep',
        'enterThen(testIfStep)',
        'foreach_testForeachConnectorStep',
        'testForeachConnectorStep',
        'exitForeach(foreach_testForeachConnectorStep)',
        'exitThen(testIfStep)',
        'exitCondition(testIfStep)',
      ]);
    });
  });

  describe('step level operations', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'testForeachConnectorStep',
          type: 'slack',
          connectorId: 'slack',
          if: 'false',
          foreach: '["item1", "item2", "item3"]',
          'on-failure': {
            retry: {
              'max-attempts': 10,
              delay: '2s',
            },
            fallback: [
              {
                name: 'innerFallbackStep',
                type: 'slack',
                connectorId: 'slack',
                with: {
                  message: 'Hello from foreach nested step 1',
                },
              } as ConnectorStep,
            ],
            continue: true,
          },
          with: {
            message: 'Hello from foreach nested step 1',
          },
        } as ConnectorStep,
      ],
    } as Partial<WorkflowYaml>;

    it('should have correct topological order', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const topsort = graphlib.alg.topsort(executionGraph);
      expect(topsort).toEqual([
        'enterContinue_testForeachConnectorStep',
        'enterTryBlock_testForeachConnectorStep',
        'enterNormalPath_testForeachConnectorStep',
        'enterRetry_testForeachConnectorStep',
        'if_testForeachConnectorStep',
        'enterThen(if_testForeachConnectorStep)',
        'foreach_testForeachConnectorStep',
        'testForeachConnectorStep',
        'exitForeach(foreach_testForeachConnectorStep)',
        'exitThen(if_testForeachConnectorStep)',
        'exitCondition(if_testForeachConnectorStep)',
        'exitRetry_testForeachConnectorStep',
        'exitNormalPath_testForeachConnectorStep',
        'enterFallbackPath_testForeachConnectorStep',
        'innerFallbackStep',
        'exitFallbackPath_testForeachConnectorStep',
        'exitTryBlock_testForeachConnectorStep',
        'exitContinue_testForeachConnectorStep',
      ]);
    });
  });
});
