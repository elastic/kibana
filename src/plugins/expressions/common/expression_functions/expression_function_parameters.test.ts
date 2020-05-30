/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
