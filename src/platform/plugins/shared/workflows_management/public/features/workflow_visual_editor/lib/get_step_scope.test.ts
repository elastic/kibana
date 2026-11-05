/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowContextRegistry } from '@kbn/workflows-yaml';
import { getStepScope } from './get_step_scope';

const registry: WorkflowContextRegistry = {
  getStepOutput: () => undefined,
  getConnector: () => undefined,
  getTriggerDefinition: () => undefined,
};

const consoleStep = (name: string) => ({ name, type: 'console', with: { message: 'x' } });

const scopeOf = (steps: unknown[], stepName: string) => {
  const definition = {
    version: '1',
    name: 'w',
    enabled: true,
    triggers: [{ type: 'alert' }],
    steps,
  } as unknown as WorkflowYaml;
  return getStepScope({
    registry,
    definition,
    graph: WorkflowGraph.fromWorkflowDefinition(definition),
    stepName,
  });
};

describe('getStepScope', () => {
  const loop = [
    consoleStep('before'),
    {
      name: 'loop',
      type: 'foreach',
      foreach: '{{event.alerts | json}}',
      steps: [consoleStep('inner')],
    },
    consoleStep('after'),
  ];

  it('gives a step inside a foreach the foreach scope', () => {
    expect(Object.keys(scopeOf(loop, 'inner'))).toEqual(['foreach']);
  });

  it('gives steps outside any loop nothing', () => {
    expect(scopeOf(loop, 'before')).toEqual({});
    expect(scopeOf(loop, 'after')).toEqual({});
  });

  it('gives nothing for a step that is not in the workflow', () => {
    expect(scopeOf(loop, 'missing')).toEqual({});
  });

  it('gives a step inside a while the while scope', () => {
    const steps = [
      {
        name: 'repeat',
        type: 'while',
        condition: 'true',
        steps: [consoleStep('inner')],
      },
    ];
    expect(Object.keys(scopeOf(steps, 'inner'))).toEqual(['while']);
  });

  it('offers variables only after a Set Variables step', () => {
    const steps = [
      consoleStep('first'),
      { name: 'set', type: 'data.set', with: { count: 1 } },
      consoleStep('last'),
    ];
    expect(scopeOf(steps, 'first')).toEqual({});
    expect(Object.keys(scopeOf(steps, 'last'))).toEqual(['variables']);
  });

  it('gives Map Collection its item and index', () => {
    const steps = [
      {
        name: 'mapper',
        type: 'data.map',
        items: [{ id: 'a' }],
        with: { fields: { id: '{{ item.id }}' } },
      },
    ];
    expect(Object.keys(scopeOf(steps, 'mapper')).sort()).toEqual(['index', 'item']);
  });
});
