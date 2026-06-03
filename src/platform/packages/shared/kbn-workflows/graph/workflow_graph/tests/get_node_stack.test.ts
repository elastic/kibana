/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorStep, ForEachStep, IfStep, WorkflowYaml } from '../../../spec/schema';
import { WorkflowGraph } from '../workflow_graph';

describe('getNodeStack', () => {
  const workflowDefinition = {
    steps: [
      {
        name: 'ifStepLevel',
        if: 'true',
        type: 'slack',
        connectorId: 'slack',
        with: {
          message: 'Hello from first step',
        },
      } as ConnectorStep,
      {
        name: 'notInStackStep',
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

  it('should return the correct stack for secondThenTestConnectorStep', () => {
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
    const nodeStack = workflowGraph.getNodeStack('secondThenTestConnectorStep');
    expect(nodeStack).toEqual([
      'enterForeach_testForeachStep',
      'enterCondition_testIfStep',
      'enterThen_testIfStep',
    ]);
  });

  it('should return the correct stack for ifStepLevel', () => {
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
    const nodeStack = workflowGraph.getNodeStack('ifStepLevel');
    expect(nodeStack).toEqual(['enterCondition_if_ifStepLevel', 'enterThen_if_ifStepLevel']);
  });

  it('should return empty stack for top-level step without control-flow wrappers', () => {
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
    const nodeStack = workflowGraph.getNodeStack('notInStackStep');
    expect(nodeStack).toEqual([]);
  });

  it('throws when the node id does not exist in the graph', () => {
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);

    expect(() => workflowGraph.getNodeStack('unknown-node-id')).toThrow(
      'Node not found for node id: unknown-node-id'
    );
  });

  it('should return enterThen stack for firstThenTestConnectorStep', () => {
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
    expect(workflowGraph.getNodeStack('firstThenTestConnectorStep')).toEqual([
      'enterForeach_testForeachStep',
      'enterCondition_testIfStep',
      'enterThen_testIfStep',
    ]);
  });

  it('should return enterElse stack for elseTestConnectorStep', () => {
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
    expect(workflowGraph.getNodeStack('elseTestConnectorStep')).toEqual([
      'enterForeach_testForeachStep',
      'enterCondition_testIfStep',
      'enterElse_testIfStep',
    ]);
  });
});

describe('getNodeStack timeout zones', () => {
  it('should include step-level enter-timeout-zone for a timed connector step', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'timedStep',
          type: 'slack',
          connectorId: 'slack',
          timeout: '30s',
          with: { message: 'hello' },
        } as ConnectorStep,
      ],
    } as Partial<WorkflowYaml>;

    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);

    expect(workflowGraph.getNodeStack('timedStep')).toEqual(['enterTimeoutZone_timedStep']);
    expect(workflowGraph.getNodeStack('enterTimeoutZone_timedStep')).toEqual([]);
    expect(workflowGraph.getNodeStack('exitTimeoutZone_timedStep')).toEqual([]);
  });

  it('should include workflow-level enter-timeout-zone for steps under settings.timeout', () => {
    const workflowDefinition = {
      settings: { timeout: '5m' },
      steps: [
        {
          name: 'atomicStep',
          type: 'slack',
          connectorId: 'slack',
          with: { message: 'hello' },
        } as ConnectorStep,
      ],
    } as Partial<WorkflowYaml>;

    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);

    expect(workflowGraph.getNodeStack('atomicStep')).toEqual([
      'enterTimeoutZone_workflow_level_timeout',
    ]);
    expect(workflowGraph.getNodeStack('enterTimeoutZone_workflow_level_timeout')).toEqual([]);
    expect(workflowGraph.getNodeStack('exitTimeoutZone_workflow_level_timeout')).toEqual([]);
  });

  it('should nest workflow-level and step-level enter-timeout-zone nodes', () => {
    const workflowDefinition = {
      settings: { timeout: '5m' },
      steps: [
        {
          name: 'nestedTimedStep',
          type: 'slack',
          connectorId: 'slack',
          timeout: '30s',
          with: { message: 'hello' },
        } as ConnectorStep,
      ],
    } as Partial<WorkflowYaml>;

    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);

    expect(workflowGraph.getNodeStack('nestedTimedStep')).toEqual([
      'enterTimeoutZone_workflow_level_timeout',
      'enterTimeoutZone_nestedTimedStep',
    ]);
  });

  it('should unwind enter scopes when traversing exit-timeout-zone predecessors', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'timedStep',
          type: 'slack',
          connectorId: 'slack',
          timeout: '30s',
          with: { message: 'hello' },
        } as ConnectorStep,
      ],
    } as Partial<WorkflowYaml>;

    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);

    // exit-* nodes pop matching enter frames while walking predecessors, then pop once more for the exit node itself
    expect(workflowGraph.getNodeStack('exitTimeoutZone_timedStep')).toEqual([]);
  });
});
