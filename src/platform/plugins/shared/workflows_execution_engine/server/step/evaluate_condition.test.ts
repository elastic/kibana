/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { evaluateCondition } from './evaluate_condition';

describe('evaluateCondition', () => {
  it('returns true when condition is boolean true', () => {
    expect(evaluateCondition(true, {}, 'step-1')).toBe(true);
  });

  it('returns false when condition is boolean false', () => {
    expect(evaluateCondition(false, {}, 'step-1')).toBe(false);
  });

  it('returns false when condition is undefined', () => {
    expect(evaluateCondition(undefined, {}, 'step-1')).toBe(false);
  });

  it('evaluates a simple KQL string condition against context', () => {
    const context = { status: 'active' };
    expect(evaluateCondition('status: active', context, 'step-1')).toBe(true);
  });

  it('returns false for KQL condition that does not match', () => {
    const context = { status: 'inactive' };
    expect(evaluateCondition('status: active', context, 'step-1')).toBe(false);
  });

  it('throws a syntax error for invalid KQL', () => {
    expect(() => evaluateCondition('invalid ::::', {}, 'step-1')).toThrow(
      /Syntax error in condition/
    );
  });

  it('throws for non-boolean, non-string, non-undefined types', () => {
    expect(() => evaluateCondition(42 as unknown as string, {}, 'step-1')).toThrow(
      /Invalid condition type/
    );
  });
});
