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
  IfStep,
  WaitStep,
  WorkflowOnFailure,
  WorkflowYaml,
} from '../../../spec/schema';
import { convertToWorkflowGraph } from '../build_execution_graph';

describe('on_failure graph', () => {
  describe.each([
    {
      name: 'workflow level on-failure',
      fallbackActionNodeId: 'workflow-level-on-failure_testRetryConnectorStep_fallbackAction',
      workflow: {
        settings: {
          'on-failure': {
            retry: {
              'max-attempts': 3,
              delay: '5s',
            },
            fallback: [
              {
                name: 'fallbackAction',
                type: 'console',
                with: {
                  message: 'fallback log',
                },
              } as ConnectorStep,
            ],
            continue: true,
          } as WorkflowOnFailure,
        },
        steps: [
          {
            name: 'testRetryConnectorStep',
            type: 'slack',
            connectorId: 'slack',
            with: {
              message: 'Hello from retry step',
            },
          } as ConnectorStep,
        ],
      } as Partial<WorkflowYaml>,
    },
    {
      name: 'step level on-failure',
      fallbackActionNodeId: 'fallbackAction',
      workflow: {
        steps: [
          {
            name: 'testRetryConnectorStep',
            type: 'slack',
            connectorId: 'slack',
            'on-failure': {
              retry: {
                'max-attempts': 3,
                delay: '5s',
              },
              fallback: [
                {
                  name: 'fallbackAction',
                  type: 'console',
                  with: {
                    message: 'fallback log',
                  },
                } as ConnectorStep,
              ],
              continue: true,
            } as WorkflowOnFailure,
            with: {
              message: 'Hello from retry step',
            },
          } as ConnectorStep,
        ],
      } as Partial<WorkflowYaml>,
    },
    {
      name: 'step level on-failure should override workflow level on-failure',
      fallbackActionNodeId: 'fallbackAction',
      workflow: {
        settings: {
          'on-failure': {
            retry: {
              'max-attempts': 1,
              delay: '1s',
            },
            fallback: [
              {
                name: 'workflowLevelFallbackAction',
                type: 'console',
                with: {
                  message: 'fallback log',
                },
              } as ConnectorStep,
            ],
            continue: false,
          } as WorkflowOnFailure,
        },
        steps: [
          {
            name: 'testRetryConnectorStep',
            type: 'slack',
            connectorId: 'slack',
            'on-failure': {
              retry: {
                'max-attempts': 3,
                delay: '5s',
              },
              fallback: [
                {
                  name: 'fallbackAction',
                  type: 'console',
                  with: {
                    message: 'fallback log',
                  },
                } as ConnectorStep,
              ],
              continue: true,
            } as WorkflowOnFailure,
            with: {
              message: 'Hello from retry step',
            },
          } as ConnectorStep,
        ],
      } as Partial<WorkflowYaml>,
    },
  ])('%s', (testCase) => {
    const workflowDefinition = testCase.workflow;

    it('should have correct topological order for step with retry', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const topsort = graphlib.alg.topsort(executionGraph);

      expect(topsort).toEqual([
        'enterContinue_testRetryConnectorStep',
        'enterTryBlock_testRetryConnectorStep',
        'enterNormalPath_testRetryConnectorStep',
        'enterRetry_testRetryConnectorStep',
        'testRetryConnectorStep',
        'exitRetry_testRetryConnectorStep',
        'exitNormalPath_testRetryConnectorStep',
        'enterFallbackPath_testRetryConnectorStep',
        testCase.fallbackActionNodeId,
        'exitFallbackPath_testRetryConnectorStep',
        'exitTryBlock_testRetryConnectorStep',
        'exitContinue_testRetryConnectorStep',
      ]);
    });

    it('should have correct edges for step with retry', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const edges = executionGraph.edges();
      expect(edges).toEqual(
        expect.arrayContaining([
          {
            v: 'enterContinue_testRetryConnectorStep',
            w: 'enterTryBlock_testRetryConnectorStep',
          },
          {
            v: 'exitTryBlock_testRetryConnectorStep',
            w: 'exitContinue_testRetryConnectorStep',
          },
          {
            v: 'enterTryBlock_testRetryConnectorStep',
            w: 'enterNormalPath_testRetryConnectorStep',
          },
          {
            v: 'exitNormalPath_testRetryConnectorStep',
            w: 'exitTryBlock_testRetryConnectorStep',
          },
          {
            v: 'enterNormalPath_testRetryConnectorStep',
            w: 'enterRetry_testRetryConnectorStep',
          },
          {
            v: 'exitRetry_testRetryConnectorStep',
            w: 'exitNormalPath_testRetryConnectorStep',
          },
          {
            v: 'enterRetry_testRetryConnectorStep',
            w: 'testRetryConnectorStep',
          },
          {
            v: 'testRetryConnectorStep',
            w: 'exitRetry_testRetryConnectorStep',
          },
          {
            v: 'enterTryBlock_testRetryConnectorStep',
            w: 'enterFallbackPath_testRetryConnectorStep',
          },
          {
            v: 'exitFallbackPath_testRetryConnectorStep',
            w: 'exitTryBlock_testRetryConnectorStep',
          },
          {
            v: 'enterFallbackPath_testRetryConnectorStep',
            w: testCase.fallbackActionNodeId,
          },
          {
            v: testCase.fallbackActionNodeId,
            w: 'exitFallbackPath_testRetryConnectorStep',
          },
        ])
      );
    });

    it('should configure retry node correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const retryNode = executionGraph.node('enterRetry_testRetryConnectorStep');
      expect(retryNode).toEqual({
        id: 'enterRetry_testRetryConnectorStep',
        type: 'enter-retry',
        stepId: 'testRetryConnectorStep',
        stepType: 'retry',
        exitNodeId: 'exitRetry_testRetryConnectorStep',
        configuration: {
          'max-attempts': 3,
          delay: '5s',
        },
      });
    });

    it('should configure continue node correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const continueNode = executionGraph.node('enterContinue_testRetryConnectorStep');
      expect(continueNode).toEqual({
        id: 'enterContinue_testRetryConnectorStep',
        type: 'enter-continue',
        stepId: 'testRetryConnectorStep',
        stepType: 'continue',
        exitNodeId: 'exitContinue_testRetryConnectorStep',
        configuration: {
          condition: true,
        },
      });
    });

    describe('fallback related nodes', () => {
      it('should configure EnterTryBlockNode', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const enterTryBlockNode = executionGraph.node('enterTryBlock_testRetryConnectorStep');
        expect(enterTryBlockNode).toEqual({
          id: 'enterTryBlock_testRetryConnectorStep',
          exitNodeId: 'exitTryBlock_testRetryConnectorStep',
          stepId: 'testRetryConnectorStep',
          stepType: 'fallback',
          type: 'enter-try-block',
          enterNormalPathNodeId: 'enterNormalPath_testRetryConnectorStep',
          enterFallbackPathNodeId: 'enterFallbackPath_testRetryConnectorStep',
        });
      });

      it('should configure ExitTryBlockNode', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const exitTryBlockNode = executionGraph.node('exitTryBlock_testRetryConnectorStep');
        expect(exitTryBlockNode).toEqual({
          type: 'exit-try-block',
          id: 'exitTryBlock_testRetryConnectorStep',
          stepId: 'testRetryConnectorStep',
          stepType: 'fallback',
          enterNodeId: 'enterTryBlock_testRetryConnectorStep',
        });
      });

      it('should configure EnterNormalPathNode', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const enterNormalPathNode = executionGraph.node('enterNormalPath_testRetryConnectorStep');
        expect(enterNormalPathNode).toEqual({
          id: 'enterNormalPath_testRetryConnectorStep',
          type: 'enter-normal-path',
          stepId: 'testRetryConnectorStep',
          stepType: 'fallback',
          enterZoneNodeId: 'enterTryBlock_testRetryConnectorStep',
          enterFailurePathNodeId: 'enterFallbackPath_testRetryConnectorStep',
        });
      });

      it('should configure ExitNormalPathNode', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const exitNormalPathNode = executionGraph.node('exitNormalPath_testRetryConnectorStep');
        expect(exitNormalPathNode).toEqual({
          id: 'exitNormalPath_testRetryConnectorStep',
          type: 'exit-normal-path',
          stepId: 'testRetryConnectorStep',
          stepType: 'fallback',
          enterNodeId: 'enterNormalPath_testRetryConnectorStep',
          exitOnFailureZoneNodeId: 'exitTryBlock_testRetryConnectorStep',
        });
      });

      it('should configure EnterFallbackPathNode', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const enterFallbackPathNode = executionGraph.node(
          'enterFallbackPath_testRetryConnectorStep'
        );
        expect(enterFallbackPathNode).toEqual({
          id: 'enterFallbackPath_testRetryConnectorStep',
          type: 'enter-fallback-path',
          stepId: 'testRetryConnectorStep',
          stepType: 'fallback',
          enterZoneNodeId: 'enterFallbackPath_testRetryConnectorStep',
        });
      });

      it('should configure ExitFallbackPathNode', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const exitFallbackPathNode = executionGraph.node('exitFallbackPath_testRetryConnectorStep');
        expect(exitFallbackPathNode).toEqual({
          id: 'exitFallbackPath_testRetryConnectorStep',
          type: 'exit-fallback-path',
          stepId: 'testRetryConnectorStep',
          stepType: 'fallback',
          enterNodeId: 'enterFallbackPath_testRetryConnectorStep',
          exitOnFailureZoneNodeId: 'exitTryBlock_testRetryConnectorStep',
        });
      });
    });
  });

  describe('workflow level on-failure', () => {
    const workflow = {
      settings: {
        'on-failure': {
          retry: {
            'max-attempts': 3,
            delay: '5s',
          },
          fallback: [
            {
              name: 'fallbackAction',
              type: 'console',
              with: {
                message: 'fallback log',
              },
            } as ConnectorStep,
          ],
          continue: true,
        } as WorkflowOnFailure,
      },
      steps: [],
    } as Partial<WorkflowYaml>;

    describe('fallback handling', () => {
      beforeEach(() => {
        workflow.steps = [
          {
            name: 'outer_foreach',
            type: 'foreach',
            foreach: '["outer1", "outer2"]',
            steps: [
              {
                name: 'testRetryConnectorStep',
                type: 'slack',
                connectorId: 'slack',
                with: {
                  message: 'Hello from retry step',
                },
              } as ConnectorStep,
            ],
          } as ForEachStep,
        ];
        workflow.settings!['on-failure']!.fallback = [
          {
            name: 'foreachFallbackAction',
            type: 'console',
            with: {
              message: 'fallback log',
            },
          } as ConnectorStep,
        ];
      });

      it('should correctly work with foreach when fallback is defined', () => {
        const executionGraph = convertToWorkflowGraph(workflow as any);
        const topsort = graphlib.alg.topsort(executionGraph);
        expect(topsort).toEqual([
          'enterForeach_outer_foreach',
          'enterContinue_testRetryConnectorStep',
          'enterTryBlock_testRetryConnectorStep',
          'enterNormalPath_testRetryConnectorStep',
          'enterRetry_testRetryConnectorStep',
          'testRetryConnectorStep',
          'exitRetry_testRetryConnectorStep',
          'exitNormalPath_testRetryConnectorStep',
          'enterFallbackPath_testRetryConnectorStep',
          expect.stringContaining('foreachFallbackAction'),
          'exitFallbackPath_testRetryConnectorStep',
          'exitTryBlock_testRetryConnectorStep',
          'exitContinue_testRetryConnectorStep',
          'exitForeach_outer_foreach',
        ]);
      });

      it('should prepend workflow-level-on-failure for fallbackAction', () => {
        const executionGraph = convertToWorkflowGraph(workflow as any);
        const topsort = graphlib.alg.topsort(executionGraph);
        expect(topsort).toEqual(
          expect.arrayContaining([
            'workflow-level-on-failure_testRetryConnectorStep_foreachFallbackAction',
          ])
        );
      });

      it('should not wrap if step in workflow-level on-failure', () => {
        workflow.steps = [
          {
            name: 'ifStep',
            type: 'if',
            condition: 'true',
            steps: [
              {
                name: 'trueConnectorStep',
                type: 'console',
                with: {
                  message: 'true log',
                },
              } as ConnectorStep,
            ],
            else: [
              {
                name: 'falseConnectorStep',
                type: 'console',
                with: {
                  message: 'false log',
                },
              } as ConnectorStep,
            ],
          } as IfStep,
        ];
        workflow.settings!['on-failure']!.fallback = [
          {
            name: 'fallbackAction',
            type: 'console',
            with: {
              message: 'fallback log',
            },
          } as ConnectorStep,
        ];
        const executionGraph = convertToWorkflowGraph(workflow as any);
        expect(executionGraph.nodes()).toEqual(
          expect.arrayContaining([
            'enterCondition_ifStep',
            'enterThen_ifStep',
            'enterContinue_trueConnectorStep',
            'enterTryBlock_trueConnectorStep',
            'enterNormalPath_trueConnectorStep',
            'enterRetry_trueConnectorStep',
            'trueConnectorStep',
            'exitRetry_trueConnectorStep',
            'exitNormalPath_trueConnectorStep',
            'enterFallbackPath_trueConnectorStep',
            'workflow-level-on-failure_trueConnectorStep_fallbackAction',
            'exitFallbackPath_trueConnectorStep',
            'exitTryBlock_trueConnectorStep',
            'exitContinue_trueConnectorStep',
            'exitThen_ifStep',
            'enterElse_ifStep',
            'enterContinue_falseConnectorStep',
            'enterTryBlock_falseConnectorStep',
            'enterNormalPath_falseConnectorStep',
            'enterRetry_falseConnectorStep',
            'falseConnectorStep',
            'exitRetry_falseConnectorStep',
            'exitNormalPath_falseConnectorStep',
            'enterFallbackPath_falseConnectorStep',
            'workflow-level-on-failure_falseConnectorStep_fallbackAction',
            'exitFallbackPath_falseConnectorStep',
            'exitTryBlock_falseConnectorStep',
            'exitContinue_falseConnectorStep',
            'exitElse_ifStep',
            'exitCondition_ifStep',
          ])
        );
      });

      it('should not wrap foreach step in workflow-level on-failure', () => {
        workflow.steps = [
          {
            name: 'foreachStep',
            type: 'foreach',
            foreach: '["item1", "item2"]',
            steps: [
              {
                name: 'foreachChild',
                type: 'console',
                with: {
                  message: 'foreach child log',
                },
              } as ConnectorStep,
            ],
          } as ForEachStep,
        ];
        workflow.settings!['on-failure']!.fallback = [
          {
            name: 'fallbackAction',
            type: 'console',
            with: {
              message: 'fallback log',
            },
          } as ConnectorStep,
        ];
        const executionGraph = convertToWorkflowGraph(workflow as any);
        expect(executionGraph.nodes()).toEqual(
          expect.arrayContaining([
            'enterForeach_foreachStep',
            'enterContinue_foreachChild',
            'enterTryBlock_foreachChild',
            'enterNormalPath_foreachChild',
            'enterRetry_foreachChild',
            'foreachChild',
            'exitRetry_foreachChild',
            'exitNormalPath_foreachChild',
            'enterFallbackPath_foreachChild',
            'workflow-level-on-failure_foreachChild_fallbackAction',
            'exitFallbackPath_foreachChild',
            'exitTryBlock_foreachChild',
            'exitContinue_foreachChild',
            'exitForeach_foreachStep',
          ])
        );
      });

      it('should not wrap wait step in workflow-level on-failure', () => {
        workflow.steps = [
          {
            name: 'waitStep',
            type: 'wait',
            with: {
              duration: '10sec',
            },
          } as WaitStep,
        ];
        workflow.settings!['on-failure']!.fallback = [
          {
            name: 'fallbackAction',
            type: 'console',
            with: {
              message: 'fallback log',
            },
          } as ConnectorStep,
        ];
        const executionGraph = convertToWorkflowGraph(workflow as any);
        expect(executionGraph.nodes()).toEqual(['waitStep']);
      });
    });

    it('should not set workflow level on-failure for steps inside fallback', () => {
      workflow.steps = [
        {
          name: 'testRetryConnectorStep',
          type: 'slack',
          connectorId: 'slack',
          'on-failure': {
            retry: {
              'max-attempts': 1,
              delay: '3s',
            },
            fallback: [
              {
                name: 'fallbackAction',
                type: 'console',
                with: {
                  message: 'fallback log',
                },
              } as ConnectorStep,
            ],
            continue: true,
          } as WorkflowOnFailure,
          with: {
            message: 'Hello from retry step',
          },
        } as ConnectorStep,
      ];

      const executionGraph = convertToWorkflowGraph(workflow as any);
      const topsort = graphlib.alg.topsort(executionGraph);
      expect(topsort).toEqual([
        'enterContinue_testRetryConnectorStep',
        'enterTryBlock_testRetryConnectorStep',
        'enterNormalPath_testRetryConnectorStep',
        'enterRetry_testRetryConnectorStep',
        'testRetryConnectorStep',
        'exitRetry_testRetryConnectorStep',
        'exitNormalPath_testRetryConnectorStep',
        'enterFallbackPath_testRetryConnectorStep',
        'fallbackAction',
        'exitFallbackPath_testRetryConnectorStep',
        'exitTryBlock_testRetryConnectorStep',
        'exitContinue_testRetryConnectorStep',
      ]);
    });
  });
});
