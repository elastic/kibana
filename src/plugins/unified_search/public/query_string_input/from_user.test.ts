/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fromUser } from './from_user';

describe('user input helpers', function () {
  describe('user input parser', function () {
    it('should return the input if passed an object', function () {
      expect(fromUser({ foo: 'bar' })).toEqual({ foo: 'bar' });
    });

    it('unless the object is empty, then convert it to an empty string', function () {
      expect(fromUser({})).toEqual('');
    });

    it('should pass through input strings that not start with {', function () {
      expect(fromUser('foo')).toEqual('foo');
      expect(fromUser('400')).toEqual('400');
      expect(fromUser('true')).toEqual('true');
    });

    it('should parse valid JSON and return the object instead of a string', function () {
      expect(fromUser('{}')).toEqual({});

      // invalid json remains a string
      expect(fromUser('{a:b}')).toEqual('{a:b}');
    });
  });
});
