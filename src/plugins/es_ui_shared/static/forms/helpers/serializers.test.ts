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
