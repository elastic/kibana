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

describe('WorkflowGraph.getStepGraph', () => {
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
  let underTest: WorkflowGraph;

  beforeEach(() => {
    underTest = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
  });

  it('should return subgraph for testForeachStep', () => {
    const stepGraph = underTest.getStepGraph('testForeachStep');
    const edges = stepGraph.getEdges();
    expect(stepGraph.topologicalOrder).toEqual([
      'enterForeach_testForeachStep',
      'enterCondition_testIfStep',
      'enterThen_testIfStep',
      'firstThenTestConnectorStep',
      'secondThenTestConnectorStep',
      'exitThen_testIfStep',
      'enterElse_testIfStep',
      'elseTestConnectorStep',
      'exitElse_testIfStep',
      'exitCondition_testIfStep',
      'exitForeach_testForeachStep',
    ]);
    expect(edges).toEqual([
      {
        v: 'enterForeach_testForeachStep',
        w: 'enterCondition_testIfStep',
      },
      {
        v: 'enterCondition_testIfStep',
        w: 'enterThen_testIfStep',
      },
      {
        v: 'enterCondition_testIfStep',
        w: 'enterElse_testIfStep',
      },
      {
        v: 'enterThen_testIfStep',
        w: 'firstThenTestConnectorStep',
      },
      {
        v: 'firstThenTestConnectorStep',
        w: 'secondThenTestConnectorStep',
      },
      {
        v: 'secondThenTestConnectorStep',
        w: 'exitThen_testIfStep',
      },
      {
        v: 'exitThen_testIfStep',
        w: 'exitCondition_testIfStep',
      },
      {
        v: 'enterElse_testIfStep',
        w: 'elseTestConnectorStep',
      },
      {
        v: 'elseTestConnectorStep',
        w: 'exitElse_testIfStep',
      },
      {
        v: 'exitElse_testIfStep',
        w: 'exitCondition_testIfStep',
      },
      {
        v: 'exitCondition_testIfStep',
        w: 'exitForeach_testForeachStep',
      },
    ]);
  });

  it('should return subgraph for secondThenTestConnectorStep', () => {
    const stepGraph = underTest.getStepGraph('secondThenTestConnectorStep');
    const edges = stepGraph.getEdges();
    expect(stepGraph.topologicalOrder).toEqual(['secondThenTestConnectorStep']);
    expect(edges).toEqual([]);
  });

  it('should return subgraph for if condition defined on step-level', () => {
    const stepGraph = underTest.getStepGraph('if_ifStepLevel');
    const edges = stepGraph.getEdges();
    expect(stepGraph.topologicalOrder).toEqual([
      'enterCondition_if_ifStepLevel',
      'enterThen_if_ifStepLevel',
      'ifStepLevel',
      'exitThen_if_ifStepLevel',
      'exitCondition_if_ifStepLevel',
    ]);
    expect(edges).toEqual([
      {
        v: 'enterCondition_if_ifStepLevel',
        w: 'enterThen_if_ifStepLevel',
      },
      {
        v: 'enterThen_if_ifStepLevel',
        w: 'ifStepLevel',
      },
      {
        v: 'ifStepLevel',
        w: 'exitThen_if_ifStepLevel',
      },
      {
        v: 'exitThen_if_ifStepLevel',
        w: 'exitCondition_if_ifStepLevel',
      },
    ]);
  });

  it('should return subgraph for elseTestConnectorStep', () => {
    const stepGraph = underTest.getStepGraph('elseTestConnectorStep');
    const edges = stepGraph.getEdges();
    expect(stepGraph.topologicalOrder).toEqual(['elseTestConnectorStep']);
    expect(edges).toEqual([]);
  });
});
