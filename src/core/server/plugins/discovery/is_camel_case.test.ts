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

import { isCamelCase } from './is_camel_case';

describe('isCamelCase', () => {
  it('matches a string in camelCase', () => {
    expect(isCamelCase('foo')).toBe(true);
    expect(isCamelCase('foo1')).toBe(true);
    expect(isCamelCase('fooBar')).toBe(true);
    expect(isCamelCase('fooBarBaz')).toBe(true);
    expect(isCamelCase('fooBAR')).toBe(true);
  });

  it('does not match strings in other cases', () => {
    expect(isCamelCase('AAA')).toBe(false);
    expect(isCamelCase('FooBar')).toBe(false);
    expect(isCamelCase('3Foo')).toBe(false);
    expect(isCamelCase('o_O')).toBe(false);
    expect(isCamelCase('foo_bar')).toBe(false);
    expect(isCamelCase('foo_')).toBe(false);
    expect(isCamelCase('_fooBar')).toBe(false);
    expect(isCamelCase('fooBar_')).toBe(false);
    expect(isCamelCase('_fooBar_')).toBe(false);
  });
});
