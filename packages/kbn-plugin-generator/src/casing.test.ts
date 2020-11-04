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

import { camelCase, snakeCase, upperCamelCase } from './casing';

describe('camelCase', () => {
  it.each([
    ['foo', 'foo'],
    ['foo_bar', 'fooBar'],
    ['foo bar', 'fooBar'],
    ['fooBar', 'fooBar'],
    ['___foo *$( bar 14', 'fooBar14'],
    ['foo-bar', 'fooBar'],
    ['FOO BAR', 'fooBar'],
    ['FOO_BAR', 'fooBar'],
    ['FOOBAR', 'foobar'],
  ])('converts %j to %j', (input, output) => {
    expect(camelCase(input)).toBe(output);
  });
});

describe('upperCamelCase', () => {
  it.each([
    ['foo', 'Foo'],
    ['foo_bar', 'FooBar'],
    ['foo bar', 'FooBar'],
    ['fooBar', 'FooBar'],
    ['___foo *$( bar 14', 'FooBar14'],
    ['foo-bar', 'FooBar'],
    ['FOO BAR', 'FooBar'],
    ['FOO_BAR', 'FooBar'],
    ['FOOBAR', 'Foobar'],
  ])('converts %j to %j', (input, output) => {
    expect(upperCamelCase(input)).toBe(output);
  });
});

describe('snakeCase', () => {
  it.each([
    ['foo', 'foo'],
    ['foo_bar', 'foo_bar'],
    ['foo bar', 'foo_bar'],
    ['fooBar', 'foo_bar'],
    ['___foo *$( bar 14', 'foo_bar_14'],
    ['foo-bar', 'foo_bar'],
    ['FOO BAR', 'foo_bar'],
    ['FOO_BAR', 'foo_bar'],
    ['FOOBAR', 'foobar'],
  ])('converts %j to %j', (input, output) => {
    expect(snakeCase(input)).toBe(output);
  });
});
