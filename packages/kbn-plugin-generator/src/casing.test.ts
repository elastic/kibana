/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
