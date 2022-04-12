/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { formatPayload } from './format_payload';

describe('formatPayload', () => {
  test('appends `_str` to string values', () => {
    const payload = {
      foo: 'bar',
      baz: ['qux'],
    };

    expect(formatPayload(payload)).toEqual({
      foo_str: payload.foo,
      baz_strs: payload.baz,
    });
  });

  test('appends `_int` to integer values', () => {
    const payload = {
      foo: 1,
      baz: [100000],
    };

    expect(formatPayload(payload)).toEqual({
      foo_int: payload.foo,
      baz_ints: payload.baz,
    });
  });

  test('appends `_real` to integer values', () => {
    const payload = {
      foo: 1.5,
      baz: [100000.5],
    };

    expect(formatPayload(payload)).toEqual({
      foo_real: payload.foo,
      baz_reals: payload.baz,
    });
  });

  test('appends `_bool` to booleans values', () => {
    const payload = {
      foo: true,
      baz: [false],
    };

    expect(formatPayload(payload)).toEqual({
      foo_bool: payload.foo,
      baz_bools: payload.baz,
    });
  });

  test('appends `_date` to Date values', () => {
    const payload = {
      foo: new Date(),
      baz: [new Date()],
    };

    expect(formatPayload(payload)).toEqual({
      foo_date: payload.foo,
      baz_dates: payload.baz,
    });
  });

  test('supports nested values', () => {
    const payload = {
      nested: {
        foo: 'bar',
        baz: ['qux'],
      },
    };

    expect(formatPayload(payload)).toEqual({
      nested: {
        foo_str: payload.nested.foo,
        baz_strs: payload.nested.baz,
      },
    });
  });

  test('does not mutate reserved keys', () => {
    const payload = {
      uid: 'uid',
      displayName: 'displayName',
      email: 'email',
      acctId: 'acctId',
      website: 'website',
      pageName: 'pageName',
    };

    expect(formatPayload(payload)).toEqual(payload);
  });

  test('removes undefined values', () => {
    const payload = {
      foo: undefined,
      baz: [undefined],
    };

    expect(formatPayload(payload)).toEqual({});
  });

  describe('String to Date identification', () => {
    test('appends `_date` to ISO string values', () => {
      const payload = {
        foo: new Date().toISOString(),
        baz: [new Date().toISOString()],
      };

      expect(formatPayload(payload)).toEqual({
        foo_date: payload.foo,
        baz_dates: payload.baz,
      });
    });

    test('appends `_str` to random string values', () => {
      const payload = {
        foo: 'test-1',
        baz: ['test-1'],
      };

      expect(formatPayload(payload)).toEqual({
        foo_str: payload.foo,
        baz_strs: payload.baz,
      });
    });
  });
});
