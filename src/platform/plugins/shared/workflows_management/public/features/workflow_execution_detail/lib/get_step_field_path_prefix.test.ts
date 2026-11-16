/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStepFieldPathPrefix } from './get_step_field_path_prefix';

describe('getStepFieldPathPrefix', () => {
  it('returns steps.{id}.output for a regular step output', () => {
    expect(
      getStepFieldPathPrefix({
        stepId: 'lookup_host',
        stepType: 'console',
        mode: 'output',
      })
    ).toBe('steps.lookup_host.output');
  });

  it('returns undefined for regular step input', () => {
    expect(
      getStepFieldPathPrefix({
        stepId: 'lookup_host',
        stepType: 'console',
        mode: 'input',
      })
    ).toBeUndefined();
  });

  it('returns undefined when the output is an error', () => {
    expect(
      getStepFieldPathPrefix({
        stepId: 'lookup_host',
        stepType: 'console',
        mode: 'output',
        hasError: true,
      })
    ).toBeUndefined();
  });

  it('returns inputs for a manual trigger input', () => {
    expect(
      getStepFieldPathPrefix({
        stepId: 'trigger',
        stepType: 'trigger_manual',
        mode: 'input',
      })
    ).toBe('inputs');
  });

  it('returns event for an alert trigger input', () => {
    expect(
      getStepFieldPathPrefix({
        stepId: 'trigger',
        stepType: 'trigger_alert',
        mode: 'input',
      })
    ).toBe('event');
  });

  it('returns an empty prefix for overview and trigger output', () => {
    expect(
      getStepFieldPathPrefix({
        stepId: 'Overview',
        stepType: '__overview',
        mode: 'input',
      })
    ).toBe('');
    expect(
      getStepFieldPathPrefix({
        stepId: 'trigger',
        stepType: 'trigger_manual',
        mode: 'output',
      })
    ).toBe('');
  });
});
