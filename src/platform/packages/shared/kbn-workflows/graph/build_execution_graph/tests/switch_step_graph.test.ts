/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { graphlib } from '@dagrejs/dagre';
import type { ConnectorStep, SwitchStep, WorkflowYaml } from '../../../spec/schema';
import type {
  EnterCaseBranchNode,
  EnterDefaultBranchNode,
  EnterSwitchNode,
  ExitCaseBranchNode,
  ExitDefaultBranchNode,
  ExitSwitchNode,
} from '../../types';
import { convertToWorkflowGraph } from '../build_execution_graph';

describe('convertToWorkflowGraph - switch step', () => {
  describe('switch with two cases and default', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'testSwitchStep',
          type: 'switch',
          expression: '{{ steps.check.output.status }}',
          cases: [
            {
              match: 'success',
              steps: [
                {
                  name: 'successStep',
                  type: 'slack',
                  connectorId: 'slack',
                  with: { message: 'Success!' },
                } as ConnectorStep,
              ],
            },
            {
              match: 'failure',
              steps: [
                {
                  name: 'failureStep',
                  type: 'slack',
                  connectorId: 'slack',
                  with: { message: 'Failure!' },
                } as ConnectorStep,
              ],
            },
          ],
          default: [
            {
              name: 'defaultStep',
              type: 'slack',
              connectorId: 'slack',
              with: { message: 'Default!' },
            } as ConnectorStep,
          ],
        } as SwitchStep,
      ],
    } as Partial<WorkflowYaml>;

    it('should return nodes in correct topological order', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toEqual([
        'enterSwitch_testSwitchStep',
        'enterCase_testSwitchStep_0',
        'successStep',
        'exitCase_testSwitchStep_0',
        'enterCase_testSwitchStep_1',
        'failureStep',
        'exitCase_testSwitchStep_1',
        'enterDefault_testSwitchStep',
        'defaultStep',
        'exitDefault_testSwitchStep',
        'exitSwitch_testSwitchStep',
      ]);
    });

    it('should return correct edges', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const edges = executionGraph.edges();
      expect(edges).toEqual(
        expect.arrayContaining([
          { v: 'enterSwitch_testSwitchStep', w: 'enterCase_testSwitchStep_0' },
          { v: 'enterCase_testSwitchStep_0', w: 'successStep' },
          { v: 'successStep', w: 'exitCase_testSwitchStep_0' },
          { v: 'exitCase_testSwitchStep_0', w: 'exitSwitch_testSwitchStep' },
          { v: 'enterSwitch_testSwitchStep', w: 'enterCase_testSwitchStep_1' },
          { v: 'enterCase_testSwitchStep_1', w: 'failureStep' },
          { v: 'failureStep', w: 'exitCase_testSwitchStep_1' },
          { v: 'exitCase_testSwitchStep_1', w: 'exitSwitch_testSwitchStep' },
          { v: 'enterSwitch_testSwitchStep', w: 'enterDefault_testSwitchStep' },
          { v: 'enterDefault_testSwitchStep', w: 'defaultStep' },
          { v: 'defaultStep', w: 'exitDefault_testSwitchStep' },
          { v: 'exitDefault_testSwitchStep', w: 'exitSwitch_testSwitchStep' },
        ])
      );
    });

    it('should configure enter-switch node correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const enterSwitchNode = executionGraph.node('enterSwitch_testSwitchStep');
      expect(enterSwitchNode).toEqual({
        id: 'enterSwitch_testSwitchStep',
        type: 'enter-switch',
        stepId: 'testSwitchStep',
        stepType: 'switch',
        exitNodeId: 'exitSwitch_testSwitchStep',
        configuration: {
          name: 'testSwitchStep',
          type: 'switch',
          expression: '{{ steps.check.output.status }}',
        },
      } as EnterSwitchNode);
    });

    it('should configure enter-case-branch nodes correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);

      const case0 = executionGraph.node('enterCase_testSwitchStep_0');
      expect(case0).toEqual({
        id: 'enterCase_testSwitchStep_0',
        type: 'enter-case-branch',
        match: 'success',
        index: 0,
        stepId: 'testSwitchStep',
        stepType: 'switch',
      } as EnterCaseBranchNode);

      const case1 = executionGraph.node('enterCase_testSwitchStep_1');
      expect(case1).toEqual({
        id: 'enterCase_testSwitchStep_1',
        type: 'enter-case-branch',
        match: 'failure',
        index: 1,
        stepId: 'testSwitchStep',
        stepType: 'switch',
      } as EnterCaseBranchNode);
    });

    it('should configure exit-case-branch nodes correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);

      const exitCase0 = executionGraph.node('exitCase_testSwitchStep_0');
      expect(exitCase0).toEqual({
        id: 'exitCase_testSwitchStep_0',
        type: 'exit-case-branch',
        startNodeId: 'enterCase_testSwitchStep_0',
        stepId: 'testSwitchStep',
        stepType: 'switch',
      } as ExitCaseBranchNode);
    });

    it('should configure enter-default-branch node correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const enterDefault = executionGraph.node('enterDefault_testSwitchStep');
      expect(enterDefault).toEqual({
        id: 'enterDefault_testSwitchStep',
        type: 'enter-default-branch',
        stepId: 'testSwitchStep',
        stepType: 'switch',
      } as EnterDefaultBranchNode);
    });

    it('should configure exit-default-branch node correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const exitDefault = executionGraph.node('exitDefault_testSwitchStep');
      expect(exitDefault).toEqual({
        id: 'exitDefault_testSwitchStep',
        type: 'exit-default-branch',
        startNodeId: 'enterDefault_testSwitchStep',
        stepId: 'testSwitchStep',
        stepType: 'switch',
      } as ExitDefaultBranchNode);
    });

    it('should configure exit-switch node correctly', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const exitSwitch = executionGraph.node('exitSwitch_testSwitchStep');
      expect(exitSwitch).toEqual({
        id: 'exitSwitch_testSwitchStep',
        type: 'exit-switch',
        stepId: 'testSwitchStep',
        stepType: 'switch',
        startNodeId: 'enterSwitch_testSwitchStep',
      } as ExitSwitchNode);
    });
  });

  describe('switch without default branch', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'testSwitchNoDefault',
          type: 'switch',
          expression: '{{ steps.check.output.status }}',
          cases: [
            {
              match: 'active',
              steps: [
                {
                  name: 'activeStep',
                  type: 'slack',
                  connectorId: 'slack',
                  with: { message: 'Active!' },
                } as ConnectorStep,
              ],
            },
          ],
        } as SwitchStep,
      ],
    } as Partial<WorkflowYaml>;

    it('should return nodes without default branch nodes', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toEqual([
        'enterSwitch_testSwitchNoDefault',
        'enterCase_testSwitchNoDefault_0',
        'activeStep',
        'exitCase_testSwitchNoDefault_0',
        'exitSwitch_testSwitchNoDefault',
      ]);
    });

    it('should not include default branch edges', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const nodeIds = executionGraph.nodes();
      expect(nodeIds).not.toContain('enterDefault_testSwitchNoDefault');
      expect(nodeIds).not.toContain('exitDefault_testSwitchNoDefault');
    });
  });

  describe('switch with multiple steps per case', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'testSwitchMultiStep',
          type: 'switch',
          expression: '{{ steps.check.output.priority }}',
          cases: [
            {
              match: 'high',
              steps: [
                {
                  name: 'firstHighStep',
                  type: 'slack',
                  connectorId: 'slack',
                  with: { message: 'High priority step 1' },
                } as ConnectorStep,
                {
                  name: 'secondHighStep',
                  type: 'openai',
                  connectorId: 'openai',
                  with: { message: 'High priority step 2' },
                } as ConnectorStep,
              ],
            },
          ],
        } as SwitchStep,
      ],
    } as Partial<WorkflowYaml>;

    it('should chain inner steps sequentially within a case', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toEqual([
        'enterSwitch_testSwitchMultiStep',
        'enterCase_testSwitchMultiStep_0',
        'firstHighStep',
        'secondHighStep',
        'exitCase_testSwitchMultiStep_0',
        'exitSwitch_testSwitchMultiStep',
      ]);
    });

    it('should have correct edges for chained inner steps', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const edges = executionGraph.edges();
      expect(edges).toEqual(
        expect.arrayContaining([
          { v: 'enterCase_testSwitchMultiStep_0', w: 'firstHighStep' },
          { v: 'firstHighStep', w: 'secondHighStep' },
          { v: 'secondHighStep', w: 'exitCase_testSwitchMultiStep_0' },
        ])
      );
    });
  });

  describe('switch preceded and followed by other steps', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'beforeStep',
          type: 'slack',
          connectorId: 'slack',
          with: { message: 'before' },
        } as ConnectorStep,
        {
          name: 'switchStep',
          type: 'switch',
          expression: '{{ steps.beforeStep.output.result }}',
          cases: [
            {
              match: 'yes',
              steps: [
                {
                  name: 'yesStep',
                  type: 'slack',
                  connectorId: 'slack',
                  with: { message: 'yes' },
                } as ConnectorStep,
              ],
            },
          ],
        } as SwitchStep,
        {
          name: 'afterStep',
          type: 'slack',
          connectorId: 'slack',
          with: { message: 'after' },
        } as ConnectorStep,
      ],
    } as Partial<WorkflowYaml>;

    it('should connect switch step between surrounding steps', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const edges = executionGraph.edges();
      expect(edges).toEqual(
        expect.arrayContaining([
          { v: 'beforeStep', w: 'enterSwitch_switchStep' },
          { v: 'exitSwitch_switchStep', w: 'afterStep' },
        ])
      );
    });
  });

  describe('switch with numeric case values', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'numericSwitch',
          type: 'switch',
          expression: '{{ steps.check.output.code }}',
          cases: [
            {
              match: 200,
              steps: [
                {
                  name: 'okStep',
                  type: 'slack',
                  connectorId: 'slack',
                  with: { message: 'OK' },
                } as ConnectorStep,
              ],
            },
            {
              match: 404,
              steps: [
                {
                  name: 'notFoundStep',
                  type: 'slack',
                  connectorId: 'slack',
                  with: { message: 'Not Found' },
                } as ConnectorStep,
              ],
            },
          ],
        } as SwitchStep,
      ],
    } as Partial<WorkflowYaml>;

    it('should configure case branch nodes with numeric values', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as WorkflowYaml);
      const case0 = executionGraph.node(
        'enterCase_numericSwitch_0'
      ) as unknown as EnterCaseBranchNode;
      expect(case0.match).toBe(200);

      const case1 = executionGraph.node(
        'enterCase_numericSwitch_1'
      ) as unknown as EnterCaseBranchNode;
      expect(case1.match).toBe(404);
    });
  });
});
