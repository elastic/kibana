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

  it('should return empty stack for ifStepLevel', () => {
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
    const nodeStack = workflowGraph.getNodeStack('notInStackStep');
    expect(nodeStack).toEqual([]);
  });
});
