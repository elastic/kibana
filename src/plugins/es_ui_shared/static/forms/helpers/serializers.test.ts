/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stripEmptyFields } from './serializers';

describe('Serializers', () => {
  describe('stripEmptyFields()', () => {
    let object: { [key: string]: any };

    beforeEach(() => {
      object = {
        a: '',
        b: '  ',
        c: '0',
        d: 0,
        e: false,
        f: null,
        g: [],
        h: {},
        i: {
          a: '',
          b: {},
          c: null,
          d: 123,
        },
      };
    });

    test('should not remove empty string or empty object in child objects (not recursively = default)', () => {
      const expected = {
        c: object.c,
        d: object.d,
        e: object.e,
        f: object.f,
        g: object.g,
        i: object.i, // not mutaded
      };
      expect(stripEmptyFields(object)).toEqual(expected);
    });

    test('should remove all empty string and empty object (recursively)', () => {
      const expected = {
        c: object.c,
        d: object.d,
        e: object.e,
        f: object.f,
        g: object.g,
        i: {
          c: object.i.c,
          d: object.i.d,
        },
      };
      expect(stripEmptyFields(object, { recursive: true })).toEqual(expected);
    });

    test('should only remove empty string (recursively)', () => {
      const expected = {
        a: object.a,
        b: object.b,
        c: object.c,
        d: object.d,
        e: object.e,
        f: object.f,
        g: object.g,
        i: {
          a: object.i.a,
          c: object.i.c,
          d: object.i.d,
        },
      };
      expect(stripEmptyFields(object, { recursive: true, types: ['object'] })).toEqual(expected);
    });

    test('should only remove empty objects (recursively)', () => {
      const expected = {
        c: object.c,
        d: object.d,
        e: object.e,
        f: object.f,
        g: object.g,
        h: object.h,
        i: {
          b: object.i.b,
          c: object.i.c,
          d: object.i.d,
        },
      };
      expect(stripEmptyFields(object, { recursive: true, types: ['string'] })).toEqual(expected);
    });
  });
});
