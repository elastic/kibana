/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createGetterSetter } from './create_getter_setter';

describe('createGetterSetter', () => {
  test('should be able to create getter/setter', () => {
    const [getString, setString] = createGetterSetter<{}>('string');

    expect(getString).toBeInstanceOf(Function);
    expect(setString).toBeInstanceOf(Function);
  });

  test('getter should return the set value', () => {
    const [getString, setString] = createGetterSetter<{}>('string');

    setString('test');
    expect(getString()).toBe('test');
  });

  test('getter should throw an exception', () => {
    const [getString] = createGetterSetter<{}>('string');

    expect(() => getString()).toThrowErrorMatchingInlineSnapshot(`"string was not set."`);
  });

  test('getter should not throw an exception (isValueRequired is false)', () => {
    const [getString] = createGetterSetter<{}>('string', false);
    const value = getString();

    expect(value).toBeUndefined();
  });
});
