/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getReturnedOutputNames } from './get_returned_output_names';

describe('getReturnedOutputNames', () => {
  it('collects the names set by workflow.output steps, including nested ones', () => {
    expect(
      getReturnedOutputNames({
        steps: [
          {
            name: 'check',
            type: 'if',
            condition: 'true',
            steps: [{ name: 'high', type: 'workflow.output', with: { severity: 'high' } }],
            else: [{ name: 'low', type: 'workflow.output', with: { severity: 'low', score: 1 } }],
          },
        ],
      })
    ).toEqual(['severity', 'score']);
  });

  it('ignores step-shaped data inside with', () => {
    expect(
      getReturnedOutputNames({
        steps: [
          {
            name: 'log',
            type: 'console',
            with: { message: { type: 'workflow.output', with: { fake: 1 } } },
          },
          { name: 'emit', type: 'workflow.output', with: { real: 1 } },
        ],
      })
    ).toEqual(['real']);
  });

  it('ignores workflow.output steps that fail or cancel the run', () => {
    const emitOnFailure = (status: string) => ({
      name: 'on_error',
      type: 'workflow.output',
      status,
      with: { message: 'boom' },
    });
    expect(
      getReturnedOutputNames({
        steps: [
          {
            name: 'emit',
            type: 'workflow.output',
            status: 'completed',
            with: { severity: 'high' },
          },
          emitOnFailure('failed'),
          emitOnFailure('cancelled'),
        ],
      })
    ).toEqual(['severity']);
    expect(getReturnedOutputNames({ steps: [emitOnFailure('failed')] })).toBeUndefined();
  });

  it('is undefined without a workflow.output step or when one sets a computed value', () => {
    expect(getReturnedOutputNames({ steps: [{ name: 'log', type: 'console' }] })).toBeUndefined();
    expect(
      getReturnedOutputNames({
        steps: [
          { name: 'emit', type: 'workflow.output', with: { severity: 'high' } },
          { name: 'emit_all', type: 'workflow.output', with: '${{ steps.prev.output }}' },
        ],
      })
    ).toBeUndefined();
  });
});
