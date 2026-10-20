/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const ERROR_MESSAGE = 'Code generation from strings disallowed for this context';

describe('disallow_code_generation setup', () => {
  it('blocks eval()', () => {
    // eslint-disable-next-line no-eval -- verifying that eval is blocked
    expect(() => eval('1+1')).toThrow(EvalError);
    // eslint-disable-next-line no-eval -- verifying that eval is blocked
    expect(() => eval('1+1')).toThrow(ERROR_MESSAGE);
  });

  it('blocks new Function()', () => {
    // eslint-disable-next-line no-new-func -- verifying that Function constructor is blocked
    expect(() => new Function('return 1+1')).toThrow(EvalError);
    // eslint-disable-next-line no-new-func -- verifying that Function constructor is blocked
    expect(() => new Function('return 1+1')).toThrow(ERROR_MESSAGE);
  });

  it('blocks Function() called without new', () => {
    // eslint-disable-next-line no-new-func -- verifying that Function() is blocked
    expect(() => Function('return 1+1')).toThrow(EvalError);
    // eslint-disable-next-line no-new-func -- verifying that Function() is blocked
    expect(() => Function('return 1+1')).toThrow(ERROR_MESSAGE);
  });

  it('preserves Function.prototype so instanceof still works', () => {
    const fn = () => {};
    expect(fn instanceof Function).toBe(true);
  });
});
