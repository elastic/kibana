/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObject } from './is_plain_object';

describe('isPlainObject', () => {
  it.each([[{}], [{ a: 1 }], [{ nested: { b: [1] } }], [Object.create(null)]])(
    'accepts the object %p',
    (value) => {
      expect(isPlainObject(value)).toBe(true);
    }
  );

  it.each([[[]], [[1, 2]], [null], [undefined], ['text'], [0], [true], [() => undefined]])(
    'rejects %p',
    (value) => {
      expect(isPlainObject(value)).toBe(false);
    }
  );

  it('narrows to a record, so its keys can be read without a cast', () => {
    const value: unknown = { name: 'a' };
    expect(isPlainObject(value) ? value.name : undefined).toBe('a');
  });
});
