/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { encodeKqlTemplateValue } from '@kbn/eval-kql';
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

  it('reports the decoded condition in a syntax error', () => {
    expect(() =>
      evaluateCondition(`a: ${encodeKqlTemplateValue('x y')} invalid ::::`, {}, 'step-1')
    ).toThrow(/Syntax error in condition "a: x y invalid ::::"/);
  });

  it('decodes the interpolated values in the parser message too', () => {
    const condition = `a: ${encodeKqlTemplateValue('x y')} invalid ::::`;
    let message = '';
    try {
      evaluateCondition(condition, {}, 'step-1');
    } catch (error) {
      message = (error as Error).message;
    }

    // once in the quoted condition, once in the query echoed by the parser
    expect(message.split('a: x y invalid ::::')).toHaveLength(3);
    expect(message).not.toContain('__wftpl_');
  });

  it('evaluates templated values as literals', () => {
    const context = { consts: { secret: 's3' } };
    expect(
      evaluateCondition(
        `consts.secret: ${encodeKqlTemplateValue('wrong or consts.secret: s3')}`,
        context,
        'step-1'
      )
    ).toBe(false);
    expect(
      evaluateCondition(`consts.secret: ${encodeKqlTemplateValue('s3')}`, context, 'step-1')
    ).toBe(true);
  });

  it('throws for non-boolean, non-string, non-undefined types', () => {
    expect(() => evaluateCondition(42 as unknown as string, {}, 'step-1')).toThrow(
      /Invalid condition type/
    );
  });
});
