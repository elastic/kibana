/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getWorkflowTypes } from './get_workflow_types';

describe('getWorkflowTypes', () => {
  it('should take trigger types from top-level triggers only, ignoring trigger inputs', () => {
    const body = {
      triggers: [
        {
          type: 'manual',
          inputs: [
            { name: 'ip', type: 'string' },
            { name: 'age', type: 'number' },
          ],
        },
      ],
      steps: [{ name: 's1', type: 'console' }],
    };

    const { triggerTypes } = getWorkflowTypes(body);
    // Only the trigger's own type — not the inputs' `type: string` / `type: number`.
    expect(triggerTypes).toEqual(['manual']);
  });

  it('should collect step types including nested steps', () => {
    const body = {
      triggers: [{ type: 'manual' }],
      steps: [
        { name: 'notify', type: 'slack.sendMessage' },
        {
          name: 'loop',
          type: 'foreach',
          foreach: '{{ items }}',
          steps: [{ name: 'inner', type: 'http' }],
        },
        {
          name: 'branch',
          type: 'if',
          steps: [{ name: 'then-step', type: 'console' }],
          else: [{ name: 'else-step', type: 'elasticsearch.search' }],
        },
      ],
    };

    const { stepTypes } = getWorkflowTypes(body);
    expect(stepTypes).toEqual([
      'slack.sendMessage',
      'foreach',
      'http',
      'if',
      'console',
      'elasticsearch.search',
    ]);
  });

  it('should dedupe repeated types', () => {
    const body = {
      triggers: [{ type: 'manual' }, { type: 'manual' }],
      steps: [
        { name: 'a', type: 'console' },
        { name: 'b', type: 'console' },
      ],
    };

    const result = getWorkflowTypes(body);
    expect(result.triggerTypes).toEqual(['manual']);
    expect(result.stepTypes).toEqual(['console']);
  });

  it('should return empty arrays when there are no triggers or steps', () => {
    expect(getWorkflowTypes({})).toEqual({ stepTypes: [], triggerTypes: [] });
    expect(getWorkflowTypes({ consts: { foo: 'bar' } })).toEqual({
      stepTypes: [],
      triggerTypes: [],
    });
  });
});
