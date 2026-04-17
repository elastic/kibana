/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ConnectorStep,
  DataSetStep,
  ForEachStep,
  IfStep,
  WhileStep,
  WorkflowYaml,
} from '../../../spec/schema';
import { WorkflowGraph } from '../workflow_graph';

describe('WorkflowGraph.getInnerStepIds', () => {
  it('should return inner step IDs excluding the compound step itself', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'myLoop',
          foreach: '["a", "b"]',
          type: 'foreach',
          steps: [
            {
              name: 'innerAction',
              type: 'slack',
              connectorId: 'slack',
              with: { message: 'hi' },
            } as ConnectorStep,
          ],
        } as ForEachStep,
      ],
    } as Partial<WorkflowYaml>;

    const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
    const innerStepIds = graph.getInnerStepIds('myLoop');

    expect(innerStepIds).toEqual(new Set(['innerAction']));
  });

  it('should return nested inner step IDs for nested foreach', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'outerLoop',
          foreach: '["a", "b"]',
          type: 'foreach',
          steps: [
            {
              name: 'innerLoop',
              foreach: '["x", "y"]',
              type: 'foreach',
              steps: [
                {
                  name: 'deepAction',
                  type: 'slack',
                  connectorId: 'slack',
                  with: { message: 'deep' },
                } as ConnectorStep,
              ],
            } as ForEachStep,
          ],
        } as ForEachStep,
      ],
    } as Partial<WorkflowYaml>;

    const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
    const innerStepIds = graph.getInnerStepIds('outerLoop');

    expect(innerStepIds).toEqual(new Set(['innerLoop', 'deepAction']));
  });

  it('should return deduplicated step IDs', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'myLoop',
          foreach: '["a"]',
          type: 'foreach',
          steps: [
            {
              name: 'step1',
              type: 'slack',
              connectorId: 'slack',
              with: { message: '1' },
            } as ConnectorStep,
            {
              name: 'step2',
              type: 'slack',
              connectorId: 'slack',
              with: { message: '2' },
            } as ConnectorStep,
          ],
        } as ForEachStep,
      ],
    } as Partial<WorkflowYaml>;

    const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
    const innerStepIds = graph.getInnerStepIds('myLoop');

    expect(innerStepIds).toEqual(new Set(['step1', 'step2']));
  });

  it('should include data.set steps in the inner step IDs', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'foreachLoop',
          foreach: '["a", "b"]',
          type: 'foreach',
          steps: [
            {
              name: 'setVarStep',
              type: 'data.set',
              with: { counter: '{{foreach.index}}' },
            } as DataSetStep,
            {
              name: 'actionStep',
              type: 'slack',
              connectorId: 'slack',
              with: { message: 'hi' },
            } as ConnectorStep,
          ],
        } as ForEachStep,
      ],
    } as Partial<WorkflowYaml>;

    const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
    const innerStepIds = graph.getInnerStepIds('foreachLoop');

    // data.set steps ARE included — eviction logic protects them, not the ID collection
    expect(innerStepIds).toEqual(new Set(['setVarStep', 'actionStep']));
  });

  it('should include steps within an if block inside a foreach', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'myLoop',
          foreach: '["a"]',
          type: 'foreach',
          steps: [
            {
              name: 'conditionalStep',
              type: 'if',
              condition: 'true',
              steps: [
                {
                  name: 'thenAction',
                  type: 'slack',
                  connectorId: 'slack',
                  with: { message: 'then' },
                } as ConnectorStep,
              ],
              else: [
                {
                  name: 'elseAction',
                  type: 'slack',
                  connectorId: 'slack',
                  with: { message: 'else' },
                } as ConnectorStep,
              ],
            } as IfStep,
          ],
        } as ForEachStep,
      ],
    } as Partial<WorkflowYaml>;

    const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
    const innerStepIds = graph.getInnerStepIds('myLoop');

    expect(innerStepIds).toContain('thenAction');
    expect(innerStepIds).toContain('elseAction');
    // The if step itself also gets a synthetic step ID
    expect(innerStepIds).toContain('conditionalStep');
  });

  it('should work with while loops', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'myWhile',
          type: 'while',
          condition: 'true',
          'max-iterations': 3,
          steps: [
            {
              name: 'whileBody',
              type: 'slack',
              connectorId: 'slack',
              with: { message: 'loop' },
            } as ConnectorStep,
          ],
        } as WhileStep,
      ],
    } as Partial<WorkflowYaml>;

    const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
    const innerStepIds = graph.getInnerStepIds('myWhile');

    expect(innerStepIds).toEqual(new Set(['whileBody']));
    expect(innerStepIds.has('myWhile')).toBe(false);
  });

  it('should throw for a nonexistent step ID', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'simple',
          type: 'slack',
          connectorId: 'slack',
          with: { message: 'hi' },
        } as ConnectorStep,
      ],
    } as Partial<WorkflowYaml>;

    const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);

    expect(() => graph.getInnerStepIds('nonexistent')).toThrow();
  });
});
