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
import { usesWorkflowOnFailure } from './find_call_sites';

const log = (name: string) => ({ name, type: 'console', with: { message: name } });

describe('usesWorkflowOnFailure', () => {
  // Compared with the graph the execution engine runs, which holds the workflow-level fallback
  // steps only when it wraps a step in that handler.
  it.each([
    ['an action step', [log('a')]],
    ['a wait step', [{ name: 'w', type: 'wait', with: { duration: '1s' } }]],
    [
      'a step with its own handler',
      [{ ...log('a'), 'on-failure': { retry: { 'max-attempts': 2 } } }],
    ],
    ['a step in an if', [{ name: 'i', type: 'if', condition: 'true', steps: [log('a')] }]],
    [
      'a step in an if with its own handler',
      [
        {
          name: 'i',
          type: 'if',
          condition: 'true',
          steps: [log('a')],
          'on-failure': { continue: true },
        },
      ],
    ],
    ['a step in a foreach', [{ name: 'f', type: 'foreach', foreach: '[1]', steps: [log('a')] }]],
    [
      'only a loop exit in a foreach',
      [{ name: 'f', type: 'foreach', foreach: '[1]', steps: [{ name: 'b', type: 'loop.break' }] }],
    ],
    [
      'only a wait in a while',
      [
        {
          name: 'l',
          type: 'while',
          condition: 'false',
          steps: [{ name: 'w', type: 'wait', with: { duration: '1s' } }],
        },
      ],
    ],
    [
      'only a fallback step',
      [
        {
          name: 'w',
          type: 'wait',
          with: { duration: '1s' },
          'on-failure': { fallback: [log('f')] },
        },
      ],
    ],
  ])('agrees with the execution graph for %s', (_, steps) => {
    const graph = WorkflowGraph.fromWorkflowDefinition({
      name: 'w',
      enabled: true,
      triggers: [{ type: 'manual' }],
      settings: { 'on-failure': { fallback: [log('global')] } },
      steps,
    } as unknown as WorkflowYaml);
    const isWrapped = graph.getAllNodes().some(({ stepId }) => stepId.endsWith('global'));

    expect(usesWorkflowOnFailure(steps)).toBe(isWrapped);
  });
});
