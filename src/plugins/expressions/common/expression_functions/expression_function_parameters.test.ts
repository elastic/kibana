/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ExpressionFunctionParameter } from './expression_function_parameter';

describe('ExpressionFunctionParameter', () => {
  test('can instantiate', () => {
    const param = new ExpressionFunctionParameter('foo', {
      help: 'bar',
    });

    expect(param.name).toBe('foo');
  });

  test('checks supported types', () => {
    const param = new ExpressionFunctionParameter('foo', {
      help: 'bar',
      types: ['baz', 'quux'],
    });

    expect(param.accepts('baz')).toBe(true);
    expect(param.accepts('quux')).toBe(true);
    expect(param.accepts('quix')).toBe(false);
  });

  test('if no types are provided, then accepts any type', () => {
    const param = new ExpressionFunctionParameter('foo', {
      help: 'bar',
    });

    expect(param.accepts('baz')).toBe(true);
    expect(param.accepts('quux')).toBe(true);
    expect(param.accepts('quix')).toBe(true);
  });
});
