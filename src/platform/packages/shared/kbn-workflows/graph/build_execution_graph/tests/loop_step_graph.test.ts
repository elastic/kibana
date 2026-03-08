/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { graphlib } from '@dagrejs/dagre';
import type { ConnectorStep, ForEachStep, WorkflowYaml } from '../../../spec/schema';
import type { ExitForeachNode } from '../../types/nodes/loop_nodes';
import { convertToWorkflowGraph } from '../build_execution_graph';

describe('convertToWorkflowGraph', () => {
  describe('foreach with iteration-timeout', () => {
    it('should wrap inner steps with timeout zone inside the foreach loop', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'foreachStep',
            type: 'foreach',
            foreach: '[1,2,3]',
            'iteration-timeout': '5s',
            steps: [
              {
                name: 'innerStep',
                type: 'slack',
                connectorId: 'slack',
                with: { message: 'hello' },
              } as ConnectorStep,
            ],
          } as ForEachStep,
        ],
      } as Partial<WorkflowYaml>;

      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toEqual([
        'enterForeach_foreachStep',
        'enterTimeoutZone_iteration_foreachStep',
        'innerStep',
        'exitTimeoutZone_iteration_foreachStep',
        'exitForeach_foreachStep',
      ]);
    });

    it('should configure the iteration timeout zone node correctly', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'foreachStep',
            type: 'foreach',
            foreach: '[1,2,3]',
            'iteration-timeout': '10s',
            steps: [
              {
                name: 'innerStep',
                type: 'slack',
                connectorId: 'slack',
                with: { message: 'hello' },
              } as ConnectorStep,
            ],
          } as ForEachStep,
        ],
      } as Partial<WorkflowYaml>;

      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const node = executionGraph.node('enterTimeoutZone_iteration_foreachStep');
      expect(node).toEqual({
        id: 'enterTimeoutZone_iteration_foreachStep',
        type: 'enter-timeout-zone',
        stepId: 'iteration_foreachStep',
        stepType: 'step_level_timeout',
        timeout: '10s',
      });
    });

    it('should support both loop-level timeout and iteration-timeout', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'foreachStep',
            type: 'foreach',
            foreach: '[1,2,3]',
            timeout: '60s',
            'iteration-timeout': '5s',
            steps: [
              {
                name: 'innerStep',
                type: 'slack',
                connectorId: 'slack',
                with: { message: 'hello' },
              } as ConnectorStep,
            ],
          } as ForEachStep,
        ],
      } as Partial<WorkflowYaml>;

      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toEqual([
        'enterTimeoutZone_foreachStep',
        'enterForeach_foreachStep',
        'enterTimeoutZone_iteration_foreachStep',
        'innerStep',
        'exitTimeoutZone_iteration_foreachStep',
        'exitForeach_foreachStep',
        'exitTimeoutZone_foreachStep',
      ]);
    });
  });

  describe('foreach with iteration-on-failure', () => {
    it('should wrap inner steps with continue inside the foreach loop', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'foreachStep',
            type: 'foreach',
            foreach: '[1,2,3]',
            'iteration-on-failure': {
              continue: true,
            },
            steps: [
              {
                name: 'innerStep',
                type: 'slack',
                connectorId: 'slack',
                with: { message: 'hello' },
              } as ConnectorStep,
            ],
          } as ForEachStep,
        ],
      } as Partial<WorkflowYaml>;

      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toEqual([
        'enterForeach_foreachStep',
        'enterContinue_iteration_foreachStep',
        'innerStep',
        'exitContinue_iteration_foreachStep',
        'exitForeach_foreachStep',
      ]);
    });

    it('should wrap inner steps with retry inside the foreach loop', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'foreachStep',
            type: 'foreach',
            foreach: '[1,2,3]',
            'iteration-on-failure': {
              retry: { 'max-attempts': 3 },
            },
            steps: [
              {
                name: 'innerStep',
                type: 'slack',
                connectorId: 'slack',
                with: { message: 'hello' },
              } as ConnectorStep,
            ],
          } as ForEachStep,
        ],
      } as Partial<WorkflowYaml>;

      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toEqual([
        'enterForeach_foreachStep',
        'enterRetry_iteration_foreachStep',
        'innerStep',
        'exitRetry_iteration_foreachStep',
        'exitForeach_foreachStep',
      ]);
    });

    it('should wrap inner steps with fallback inside the foreach loop', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'foreachStep',
            type: 'foreach',
            foreach: '[1,2,3]',
            'iteration-on-failure': {
              fallback: [
                {
                  name: 'fallbackStep',
                  type: 'slack',
                  connectorId: 'slack',
                  with: { message: 'fallback' },
                } as ConnectorStep,
              ],
            },
            steps: [
              {
                name: 'innerStep',
                type: 'slack',
                connectorId: 'slack',
                with: { message: 'hello' },
              } as ConnectorStep,
            ],
          } as ForEachStep,
        ],
      } as Partial<WorkflowYaml>;

      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toEqual([
        'enterForeach_foreachStep',
        'enterTryBlock_iteration_foreachStep',
        'enterNormalPath_iteration_foreachStep',
        'innerStep',
        'exitNormalPath_iteration_foreachStep',
        'enterFallbackPath_iteration_foreachStep',
        'fallbackStep',
        'exitFallbackPath_iteration_foreachStep',
        'exitTryBlock_iteration_foreachStep',
        'exitForeach_foreachStep',
      ]);
    });

    it('should support iteration-on-failure with retry, continue, and iteration-timeout combined', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'foreachStep',
            type: 'foreach',
            foreach: '[1,2,3]',
            'iteration-timeout': '5s',
            'iteration-on-failure': {
              retry: { 'max-attempts': 2 },
              continue: true,
            },
            steps: [
              {
                name: 'innerStep',
                type: 'slack',
                connectorId: 'slack',
                with: { message: 'hello' },
              } as ConnectorStep,
            ],
          } as ForEachStep,
        ],
      } as Partial<WorkflowYaml>;

      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toEqual([
        'enterForeach_foreachStep',
        'enterContinue_iteration_foreachStep',
        'enterRetry_iteration_foreachStep',
        'enterTimeoutZone_iteration_foreachStep',
        'innerStep',
        'exitTimeoutZone_iteration_foreachStep',
        'exitRetry_iteration_foreachStep',
        'exitContinue_iteration_foreachStep',
        'exitForeach_foreachStep',
      ]);
    });
  });

  describe('foreach with max-iterations', () => {
    it('should pass maxIterations and onLimit from max-iterations config', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'foreachStep',
            type: 'foreach',
            foreach: '[1,2,3,4,5]',
            'max-iterations': { limit: 2, 'on-limit': 'fail' },
            steps: [
              {
                name: 'innerStep',
                type: 'slack',
                connectorId: 'slack',
                with: { message: 'hello' },
              } as ConnectorStep,
            ],
          } as ForEachStep,
        ],
      } as Partial<WorkflowYaml>;

      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const exitNode = executionGraph.node('exitForeach_foreachStep') as ExitForeachNode;
      expect(exitNode.maxIterations).toBe(2);
      expect(exitNode.onLimit).toBe('fail');
    });

    it('should not set maxIterations on exit node when not configured', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'foreachStep',
            type: 'foreach',
            foreach: '[1,2,3]',
            steps: [
              {
                name: 'innerStep',
                type: 'slack',
                connectorId: 'slack',
                with: { message: 'hello' },
              } as ConnectorStep,
            ],
          } as ForEachStep,
        ],
      } as Partial<WorkflowYaml>;

      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const exitNode = executionGraph.node('exitForeach_foreachStep') as ExitForeachNode;
      expect(exitNode.maxIterations).toBeUndefined();
      expect(exitNode.onLimit).toBeUndefined();
    });

    it('should support max-iterations combined with iteration-timeout and iteration-on-failure', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'foreachStep',
            type: 'foreach',
            foreach: '[1,2,3,4,5]',
            'max-iterations': { limit: 3, 'on-limit': 'continue' },
            'iteration-timeout': '5s',
            'iteration-on-failure': { continue: true },
            steps: [
              {
                name: 'innerStep',
                type: 'slack',
                connectorId: 'slack',
                with: { message: 'hello' },
              } as ConnectorStep,
            ],
          } as ForEachStep,
        ],
      } as Partial<WorkflowYaml>;

      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toEqual([
        'enterForeach_foreachStep',
        'enterContinue_iteration_foreachStep',
        'enterTimeoutZone_iteration_foreachStep',
        'innerStep',
        'exitTimeoutZone_iteration_foreachStep',
        'exitContinue_iteration_foreachStep',
        'exitForeach_foreachStep',
      ]);

      const exitNode = executionGraph.node('exitForeach_foreachStep') as ExitForeachNode;
      expect(exitNode.maxIterations).toBe(3);
      expect(exitNode.onLimit).toBe('continue');
    });
  });
});
