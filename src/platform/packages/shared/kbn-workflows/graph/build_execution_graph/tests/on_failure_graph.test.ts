/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { graphlib } from '@dagrejs/dagre';
import type { ConnectorStep, WorkflowOnFailure, WorkflowYaml } from '../../../spec/schema';
import { convertToWorkflowGraph } from '../build_execution_graph';

describe('on_failure graph', () => {
  describe.each([
    {
      name: 'workflow level on-failure',
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
        'fallbackAction',
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
            w: 'fallbackAction',
          },
          {
            v: 'fallbackAction',
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
        exitNodeId: 'exitContinue_testRetryConnectorStep',
      });
    });

    describe('fallback related nodes', () => {
      it('should configure EnterTryBlockNode', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const enterTryBlockNode = executionGraph.node('enterTryBlock_testRetryConnectorStep');
        expect(enterTryBlockNode).toEqual({
          id: 'enterTryBlock_testRetryConnectorStep',
          exitNodeId: 'exitTryBlock_testRetryConnectorStep',
          type: 'enter-try-block',
          enterNormalPathNodeId: 'enterNormalPath_testRetryConnectorStep',
        });
      });

      it('should configure ExitTryBlockNode', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const exitTryBlockNode = executionGraph.node('exitTryBlock_testRetryConnectorStep');
        expect(exitTryBlockNode).toEqual({
          type: 'exit-try-block',
          id: 'exitTryBlock_testRetryConnectorStep',
          enterNodeId: 'enterTryBlock_testRetryConnectorStep',
        });
      });

      it('should configure EnterNormalPathNode', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const enterNormalPathNode = executionGraph.node('enterNormalPath_testRetryConnectorStep');
        expect(enterNormalPathNode).toEqual({
          id: 'enterNormalPath_testRetryConnectorStep',
          type: 'enter-normal-path',
          enterZoneNodeId: 'enterNormalPath_testRetryConnectorStep',
          enterFailurePathNodeId: 'enterFallbackPath_testRetryConnectorStep',
        });
      });

      it('should configure ExitNormalPathNode', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const exitNormalPathNode = executionGraph.node('exitNormalPath_testRetryConnectorStep');
        expect(exitNormalPathNode).toEqual({
          id: 'exitNormalPath_testRetryConnectorStep',
          type: 'exit-normal-path',
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
          enterZoneNodeId: 'enterFallbackPath_testRetryConnectorStep',
        });
      });

      it('should configure ExitFallbackPathNode', () => {
        const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
        const exitFallbackPathNode = executionGraph.node('exitFallbackPath_testRetryConnectorStep');
        expect(exitFallbackPathNode).toEqual({
          id: 'exitFallbackPath_testRetryConnectorStep',
          type: 'exit-fallback-path',
          enterNodeId: 'enterFallbackPath_testRetryConnectorStep',
          exitOnFailureZoneNodeId: 'exitTryBlock_testRetryConnectorStep',
        });
      });
    });
  });

  it('should not set workflow level on-failure for steps inside fallback', () => {
    const workflow = {
      settings: {
        'on-failure': {
          retry: {
            'max-attempts': 3,
            delay: '5s',
          },
          fallback: [
            {
              name: 'workflowLevel_fallbackAction',
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
      ],
    } as Partial<WorkflowYaml>;
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
