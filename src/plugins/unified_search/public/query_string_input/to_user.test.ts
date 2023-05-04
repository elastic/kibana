/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { toUser } from './to_user';

describe('user input helpers', () => {
  describe('model presentation formatter', () => {
    test('should present objects as strings', () => {
      expect(toUser({ foo: 'bar' })).toBe('{"foo":"bar"}');
    });

    test('should present query_string queries as strings', () => {
      expect(toUser({ query_string: { query: 'lucene query string' } })).toBe(
        'lucene query string'
      );
    });

    test('should present query_string queries without a query as an empty string', () => {
      expect(toUser({ query_string: {} })).toBe('');
    });

    test('should present string as strings', () => {
      expect(toUser('foo')).toBe('foo');
    });

    test('should present numbers as strings', () => {
      expect(toUser(400)).toBe('400');
    });
  });
});
