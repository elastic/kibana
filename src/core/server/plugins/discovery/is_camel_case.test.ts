/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
