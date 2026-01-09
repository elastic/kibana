/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { graphlib } from '@dagrejs/dagre';
import type { ConnectorStep, WorkflowYaml } from '../../../spec/schema';
import { convertToWorkflowGraph } from '../build_execution_graph';

describe('convertToWorkflowGraph', () => {
  describe('steps with timeout', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'testAtomicStep1',
          type: 'slack',
          connectorId: 'slack',
          timeout: '30s',
          with: {
            message: 'Hello from atomic step 1',
          },
        } as ConnectorStep,
      ],
    } as Partial<WorkflowYaml>;

    it('should return nodes for atomic step in correct topological order', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toEqual([
        'enterTimeoutZone_testAtomicStep1',
        'testAtomicStep1',
        'exitTimeoutZone_testAtomicStep1',
      ]);
    });

    it('should return correct edges for timeout graph', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const edges = executionGraph.edges();
      expect(edges).toEqual([
        {
          v: 'enterTimeoutZone_testAtomicStep1',
          w: 'testAtomicStep1',
        },
        {
          v: 'testAtomicStep1',
          w: 'exitTimeoutZone_testAtomicStep1',
        },
      ]);
    });

    it('should configure enter timeout zone', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const node = executionGraph.node('enterTimeoutZone_testAtomicStep1');
      expect(node).toEqual({
        id: 'enterTimeoutZone_testAtomicStep1',
        type: 'enter-timeout-zone',
        stepId: 'testAtomicStep1',
        stepType: 'step_level_timeout',
        timeout: '30s',
      });
    });

    it('should configure exit timeout zone', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const node = executionGraph.node('exitTimeoutZone_testAtomicStep1');
      expect(node).toEqual({
        id: 'exitTimeoutZone_testAtomicStep1',
        type: 'exit-timeout-zone',
        stepId: 'testAtomicStep1',
        stepType: 'step_level_timeout',
      });
    });
  });

  describe('workflow-level timeout', () => {
    it('should return nodes for atomic step in correct topological order', () => {
      const workflowDefinition = {
        settings: {
          timeout: '5m',
        },
        steps: [
          {
            name: 'testAtomicStep1',
            type: 'slack',
            connectorId: 'slack',
            with: {
              message: 'Hello from atomic step 1',
            },
          } as ConnectorStep,
        ],
      } as Partial<WorkflowYaml>;
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toEqual([
        'enterTimeoutZone_workflow_level_timeout',
        'testAtomicStep1',
        'exitTimeoutZone_workflow_level_timeout',
      ]);
    });

    it('should handle both workflow-level and step-level timeouts', () => {
      const workflowDefinition = {
        settings: {
          timeout: '5m',
        },
        steps: [
          {
            name: 'stepWithTimeout',
            type: 'slack',
            connectorId: 'slack',
            timeout: '30s',
            with: {
              message: 'Step with timeout',
            },
          } as ConnectorStep,
        ],
      } as Partial<WorkflowYaml>;

      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const topSort = graphlib.alg.topsort(executionGraph);

      // Workflow-level timeout should wrap the entire workflow, including step-level timeouts
      expect(topSort).toEqual([
        'enterTimeoutZone_workflow_level_timeout',
        'enterTimeoutZone_stepWithTimeout',
        'stepWithTimeout',
        'exitTimeoutZone_stepWithTimeout',
        'exitTimeoutZone_workflow_level_timeout',
      ]);
    });

    it('should use default workflow level timeout when not specified explicitly in workflow', () => {
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
        ],
      } as Partial<WorkflowYaml>;
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml, {
        timeout: '10m',
      });
      expect(executionGraph.node('enterTimeoutZone_workflow_level_timeout')).toEqual(
        expect.objectContaining({
          timeout: '10m',
        })
      );
    });

    it('should use timeout from explicitly specified timeout in workflow', () => {
      const workflowDefinition = {
        settings: {
          timeout: '5m',
        },
        steps: [
          {
            name: 'testAtomicStep1',
            type: 'slack',
            connectorId: 'slack',
            with: {
              message: 'Hello from atomic step 1',
            },
          } as ConnectorStep,
        ],
      } as Partial<WorkflowYaml>;
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml, {
        timeout: '10m',
      });
      expect(executionGraph.node('enterTimeoutZone_workflow_level_timeout')).toEqual(
        expect.objectContaining({
          timeout: '5m',
        })
      );
    });
  });

  describe('steps with timeout and step level flow-control', () => {
    it('should return nodes correct topological order with foreach step-level', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'testAtomicStep1',
            type: 'slack',
            foreach: '[1,2,3]',
            connectorId: 'slack',
            timeout: '30s',
            with: {
              message: 'Hello from atomic step 1',
            },
          } as ConnectorStep,
        ],
      } as Partial<WorkflowYaml>;
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toEqual([
        'enterForeach_foreach_testAtomicStep1',
        'enterTimeoutZone_testAtomicStep1',
        'testAtomicStep1',
        'exitTimeoutZone_testAtomicStep1',
        'exitForeach_foreach_testAtomicStep1',
      ]);
    });

    it('should return nodes correct topological order with if step-level', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'testAtomicStep1',
            type: 'slack',
            if: 'steps:true',
            connectorId: 'slack',
            timeout: '30s',
            with: {
              message: 'Hello from atomic step 1',
            },
          } as ConnectorStep,
        ],
      } as Partial<WorkflowYaml>;
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toEqual([
        'enterCondition_if_testAtomicStep1',
        'enterThen_if_testAtomicStep1',
        'enterTimeoutZone_testAtomicStep1',
        'testAtomicStep1',
        'exitTimeoutZone_testAtomicStep1',
        'exitThen_if_testAtomicStep1',
        'exitCondition_if_testAtomicStep1',
      ]);
    });

    it('should return nodes correct topological order with on-failure step-level', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'testAtomicStep1',
            type: 'slack',
            'on-failure': {
              retry: {
                'max-attempts': 1,
              },
              continue: true,
              fallback: [
                {
                  name: 'fallback_step',
                  type: 'slack',
                  connectorId: 'slack',
                  with: {
                    message: 'Hello from fallback step',
                  },
                } as ConnectorStep,
              ],
            },
            connectorId: 'slack',
            timeout: '30s',
            with: {
              message: 'Hello from atomic step 1',
            },
          } as ConnectorStep,
        ],
      } as Partial<WorkflowYaml>;
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toEqual([
        'enterContinue_testAtomicStep1',
        'enterTryBlock_testAtomicStep1',
        'enterNormalPath_testAtomicStep1',
        'enterRetry_testAtomicStep1',
        'enterTimeoutZone_testAtomicStep1',
        'testAtomicStep1',
        'exitTimeoutZone_testAtomicStep1',
        'exitRetry_testAtomicStep1',
        'exitNormalPath_testAtomicStep1',
        'enterFallbackPath_testAtomicStep1',
        'fallback_step',
        'exitFallbackPath_testAtomicStep1',
        'exitTryBlock_testAtomicStep1',
        'exitContinue_testAtomicStep1',
      ]);
    });
  });
});
