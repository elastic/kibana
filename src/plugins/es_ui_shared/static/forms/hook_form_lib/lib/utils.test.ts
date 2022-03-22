/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { flattenObject } from './utils';

describe('Form lib utils', () => {
  describe('flattenObject', () => {
    test('should flatten an object', () => {
      const obj = {
        a: true,
        b: {
          foo: 'bar',
          baz: [
            {
              a: false,
              b: 'foo',
            },
            'bar',
            true,
          ],
        },
      };

      expect(flattenObject(obj)).toEqual({
        a: true,
        'b.baz[0].a': false,
        'b.baz[0].b': 'foo',
        'b.baz[1]': 'bar',
        'b.baz[2]': true,
        'b.foo': 'bar',
      });
    });
  });
});
