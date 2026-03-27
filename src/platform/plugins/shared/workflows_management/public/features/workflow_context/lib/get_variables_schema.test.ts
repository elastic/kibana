/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowGraph } from '@kbn/workflows/graph';
import { getVariablesSchema } from './get_variables_schema';

interface MockGraphNode {
  id: string;
  type: string;
  stepType: string;
  configuration: {
    type: string;
    with?: Record<string, unknown>;
  };
}

function createMockWorkflowGraph(opts: {
  stepNode?: MockGraphNode | undefined;
  predecessors?: MockGraphNode[];
}): WorkflowGraph {
  return {
    getStepNode: jest.fn().mockReturnValue(opts.stepNode ?? undefined),
    getAllPredecessors: jest.fn().mockReturnValue(opts.predecessors ?? []),
  } as unknown as WorkflowGraph;
}

// getStepId simply returns the name as-is
describe('getVariablesSchema', () => {
  it('returns an optional empty object schema when step node is not found', () => {
    const graph = createMockWorkflowGraph({ stepNode: undefined });
    const schema = getVariablesSchema(graph, 'nonexistent_step');

    // Should be an optional schema
    expect(schema.safeParse(undefined).success).toBe(true);
    // Should accept an empty object
    expect(schema.safeParse({}).success).toBe(true);
  });

  it('returns an optional empty object schema when there are no data.set predecessors', () => {
    const stepNode: MockGraphNode = {
      id: 'myStep',
      type: 'action',
      stepType: 'action',
      configuration: { type: 'action' },
    };

    const predecessors: MockGraphNode[] = [
      {
        id: 'otherStep',
        type: 'action',
        stepType: 'action',
        configuration: { type: 'action' },
      },
    ];

    const graph = createMockWorkflowGraph({ stepNode, predecessors });
    const schema = getVariablesSchema(graph, 'myStep');

    expect(schema.safeParse(undefined).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(true);
  });

  it('builds a schema from a single data.set predecessor with string values', () => {
    const stepNode: MockGraphNode = {
      id: 'myStep',
      type: 'action',
      stepType: 'action',
      configuration: { type: 'action' },
    };

    const dataSetNode: MockGraphNode = {
      id: 'setVars',
      type: 'data.set',
      stepType: 'data.set',
      configuration: {
        type: 'data.set',
        with: {
          greeting: 'hello',
          name: 'world',
        },
      },
    };

    const graph = createMockWorkflowGraph({ stepNode, predecessors: [dataSetNode] });
    const schema = getVariablesSchema(graph, 'myStep');

    // Should accept matching shape
    expect(schema.safeParse({ greeting: 'hi', name: 'test' }).success).toBe(true);
    // Optional schema
    expect(schema.safeParse(undefined).success).toBe(true);
  });

  it('builds a schema from a data.set predecessor with mixed types', () => {
    const stepNode: MockGraphNode = {
      id: 'myStep',
      type: 'action',
      stepType: 'action',
      configuration: { type: 'action' },
    };

    const dataSetNode: MockGraphNode = {
      id: 'setVars',
      type: 'data.set',
      stepType: 'data.set',
      configuration: {
        type: 'data.set',
        with: {
          count: 42,
          active: true,
          label: 'test',
        },
      },
    };

    const graph = createMockWorkflowGraph({ stepNode, predecessors: [dataSetNode] });
    const schema = getVariablesSchema(graph, 'myStep');

    expect(schema.safeParse({ count: 10, active: false, label: 'hi' }).success).toBe(true);
    // Wrong types
    expect(schema.safeParse({ count: 'not a number', active: true, label: 'ok' }).success).toBe(
      false
    );
  });

  it('merges schemas from multiple data.set predecessors', () => {
    const stepNode: MockGraphNode = {
      id: 'myStep',
      type: 'action',
      stepType: 'action',
      configuration: { type: 'action' },
    };

    const dataSet1: MockGraphNode = {
      id: 'setVars1',
      type: 'data.set',
      stepType: 'data.set',
      configuration: {
        type: 'data.set',
        with: { firstName: 'Alice' },
      },
    };

    const dataSet2: MockGraphNode = {
      id: 'setVars2',
      type: 'data.set',
      stepType: 'data.set',
      configuration: {
        type: 'data.set',
        with: { lastName: 'Smith' },
      },
    };

    const graph = createMockWorkflowGraph({
      stepNode,
      predecessors: [dataSet1, dataSet2],
    });
    const schema = getVariablesSchema(graph, 'myStep');

    // Should accept both keys
    expect(schema.safeParse({ firstName: 'Bob', lastName: 'Jones' }).success).toBe(true);
  });

  it('skips data.set predecessors without a with configuration', () => {
    const stepNode: MockGraphNode = {
      id: 'myStep',
      type: 'action',
      stepType: 'action',
      configuration: { type: 'action' },
    };

    const dataSetNoWith: MockGraphNode = {
      id: 'setVars',
      type: 'data.set',
      stepType: 'data.set',
      configuration: { type: 'data.set' },
    };

    const graph = createMockWorkflowGraph({
      stepNode,
      predecessors: [dataSetNoWith],
    });
    const schema = getVariablesSchema(graph, 'myStep');

    // Should behave like empty object schema since data.set had no `with`
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse(undefined).success).toBe(true);
  });

  it('ignores non-data.set predecessors even if they have stepType "data.set"', () => {
    const stepNode: MockGraphNode = {
      id: 'myStep',
      type: 'action',
      stepType: 'action',
      configuration: { type: 'action' },
    };

    // stepType is data.set (for filtering) but type is not data.set (for processing)
    const notReallyDataSet: MockGraphNode = {
      id: 'fake',
      type: 'not-data-set',
      stepType: 'data.set',
      configuration: {
        type: 'not-data-set',
        with: { shouldNotAppear: 'ignored' },
      },
    };

    const graph = createMockWorkflowGraph({
      stepNode,
      predecessors: [notReallyDataSet],
    });
    const schema = getVariablesSchema(graph, 'myStep');

    // The schema should not include shouldNotAppear since type !== 'data.set'
    expect(schema.safeParse({}).success).toBe(true);
  });

  it('returns an optional schema (undefined is always valid)', () => {
    const stepNode: MockGraphNode = {
      id: 'myStep',
      type: 'action',
      stepType: 'action',
      configuration: { type: 'action' },
    };

    const dataSet: MockGraphNode = {
      id: 'setVars',
      type: 'data.set',
      stepType: 'data.set',
      configuration: {
        type: 'data.set',
        with: { key: 'value' },
      },
    };

    const graph = createMockWorkflowGraph({ stepNode, predecessors: [dataSet] });
    const schema = getVariablesSchema(graph, 'myStep');

    expect(schema.safeParse(undefined).success).toBe(true);
  });

  it('later data.set predecessors override earlier ones for the same key', () => {
    const stepNode: MockGraphNode = {
      id: 'myStep',
      type: 'action',
      stepType: 'action',
      configuration: { type: 'action' },
    };

    const dataSet1: MockGraphNode = {
      id: 'set1',
      type: 'data.set',
      stepType: 'data.set',
      configuration: {
        type: 'data.set',
        with: { value: 'string value' },
      },
    };

    const dataSet2: MockGraphNode = {
      id: 'set2',
      type: 'data.set',
      stepType: 'data.set',
      configuration: {
        type: 'data.set',
        with: { value: 42 },
      },
    };

    const graph = createMockWorkflowGraph({
      stepNode,
      predecessors: [dataSet1, dataSet2],
    });
    const schema = getVariablesSchema(graph, 'myStep');

    // The second data.set should override the first for 'value'
    // so `value` should be a number (not string)
    expect(schema.safeParse({ value: 100 }).success).toBe(true);
    expect(schema.safeParse({ value: 'still a string' }).success).toBe(false);
  });
});
