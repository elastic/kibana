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

import { parse } from './parse';

describe('parse()', () => {
  test('parses an expression', () => {
    const ast = parse('foo bar="baz"', 'expression');

    expect(ast).toMatchObject({
      type: 'expression',
      chain: [
        {
          type: 'function',
          arguments: {
            bar: ['baz'],
          },
          function: 'foo',
        },
      ],
    });
  });

  test('throws on malformed expression', () => {
    expect(() => {
      parse('{ intentionally malformed }', 'expression');
    }).toThrowError();
  });

  test('parses an argument', () => {
    const arg = parse('foo', 'argument');
    expect(arg).toBe('foo');
  });
});
