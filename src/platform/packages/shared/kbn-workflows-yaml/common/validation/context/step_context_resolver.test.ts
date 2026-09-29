/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { getSchemaAtPath } from '@kbn/workflows/common/utils/zod';
import { WorkflowGraph } from '@kbn/workflows/graph';
import { z } from '@kbn/zod/v4';
import { createMockWorkflowContextRegistry } from './registry.mock';
import { createStepContextResolver } from './step_context_resolver';

const definition: WorkflowYaml = {
  version: '1',
  name: 'test-workflow',
  enabled: true,
  triggers: [{ type: 'manual' }],
  steps: [
    { name: 'source', type: 'console', with: { message: 'hello' } },
    { name: 'second', type: 'console', with: { message: '{{ steps.source.output }}' } },
    { name: 'third', type: 'console', with: { message: '{{ steps.source.output }}' } },
  ],
};

describe('createStepContextResolver', () => {
  it('shares predecessor entries and traverses each resolved step only once within a run', () => {
    const registry = createMockWorkflowContextRegistry();
    const graph = WorkflowGraph.fromWorkflowDefinition(definition);
    const getAllPredecessors = jest.spyOn(graph, 'getAllPredecessors');
    const resolver = createStepContextResolver(registry, definition, graph);
    const second = resolver.forStep('second');
    const third = resolver.forStep('third');

    expect(getSchemaAtPath(second, 'steps.source').schema).not.toBeNull();
    expect(getSchemaAtPath(second, 'steps.source').schema).toBe(
      getSchemaAtPath(third, 'steps.source').schema
    );
    expect(resolver.forStep('second')).toBe(second);
    expect(resolver.forStep('third')).toBe(third);
    expect(getAllPredecessors).toHaveBeenCalledTimes(2);
  });

  it('rebuilds entry schemas for a new run using the same graph and registry', () => {
    let outputSchema: z.ZodType = z.string();
    const registry = createMockWorkflowContextRegistry({
      getStepOutput: () => ({ outputSchema }),
    });
    const graph = WorkflowGraph.fromWorkflowDefinition(definition);
    const firstRun = createStepContextResolver(registry, definition, graph);
    const firstContext = firstRun.forStep('second');

    expect(getSchemaAtPath(firstContext, 'steps.source.output').schema).toBeInstanceOf(z.ZodString);

    outputSchema = z.number();
    const secondRun = createStepContextResolver(registry, definition, graph);
    const secondContext = secondRun.forStep('second');

    expect(getSchemaAtPath(secondContext, 'steps.source').schema).not.toBe(
      getSchemaAtPath(firstContext, 'steps.source').schema
    );
    expect(getSchemaAtPath(secondContext, 'steps.source.output').schema).toBeInstanceOf(
      z.ZodNumber
    );
  });
});
