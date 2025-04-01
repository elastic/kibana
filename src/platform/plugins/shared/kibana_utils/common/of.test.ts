/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from './of';

describe('of()', () => {
  describe('when promise resolves', () => {
    const promise = new Promise<void>((resolve) => resolve()).then(() => 123);

    test('first member of 3-tuple is the promise value', async () => {
      const [result] = await of(promise);
      expect(result).toBe(123);
    });

    test('second member of 3-tuple is undefined', async () => {
      const [, error] = await of(promise);
      expect(error).toBe(undefined);
    });

    test('third, flag member, of 3-tuple is true', async () => {
      const [, , resolved] = await of(promise);
      expect(resolved).toBe(true);
    });
  });

  describe('when promise rejects', () => {
    const promise = new Promise<void>((resolve) => resolve()).then(() => {
      // eslint-disable-next-line no-throw-literal
      throw 123;
    });

    test('first member of 3-tuple is undefined', async () => {
      const [result] = await of(promise);
      expect(result).toBe(undefined);
    });

    test('second member of 3-tuple is thrown error', async () => {
      const [, error] = await of(promise);
      expect(error).toBe(123);
    });

    test('third, flag member, of 3-tuple is false', async () => {
      const [, , resolved] = await of(promise);
      expect(resolved).toBe(false);
    });
  });
});
