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

  it('includes the workflow on-failure fallback', () => {
    const withFallback = (fallbackWith: unknown) => ({
      settings: {
        'on-failure': {
          fallback: [{ name: 'recover', type: 'workflow.output', with: fallbackWith }],
        },
      },
      steps: [{ name: 'emit', type: 'workflow.output', with: { severity: 'high' } }],
    });
    expect(getReturnedOutputNames(withFallback({ recovery: true }))).toEqual([
      'severity',
      'recovery',
    ]);
    expect(getReturnedOutputNames(withFallback('${{ steps.prev.output }}'))).toBeUndefined();
  });

  it('is undefined when a run can complete without reaching a workflow.output step', () => {
    const emit = { name: 'emit', type: 'workflow.output', with: { severity: 'high' } };
    const last = { name: 'last', type: 'data.set', with: { other: 1 } };
    const onlyWhen = (step: Record<string, unknown>) => ({ ...step, if: 'inputs.flag : true' });
    expect(getReturnedOutputNames({ steps: [onlyWhen(emit), last] })).toBeUndefined();
    expect(
      getReturnedOutputNames({
        steps: [{ name: 'check', type: 'if', condition: 'true', steps: [emit] }, last],
      })
    ).toBeUndefined();
    expect(
      getReturnedOutputNames({
        steps: [{ name: 'each', type: 'foreach', foreach: '[]', steps: [emit] }, last],
      })
    ).toBeUndefined();
    expect(
      getReturnedOutputNames({
        steps: [{ name: 'check', type: 'if', condition: 'true', steps: [emit] }, emit],
      })
    ).toEqual(['severity']);
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
