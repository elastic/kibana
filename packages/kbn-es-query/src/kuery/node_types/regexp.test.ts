/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildNode, toQueryStringQuery } from './regexp';

jest.mock('../grammar');

describe('kuery node types', () => {
  describe('regexp', () => {
    describe('buildNode', () => {
      test('should accept a string argument representing a regexp string', () => {
        const value = `/foobar/`;
        const flags = 'i';
        const result = buildNode(value, flags);

        expect(result).toHaveProperty('type', 'regexp');
        expect(result).toHaveProperty('value', value);
        expect(result).toHaveProperty('flags', flags);
      });
    });

    describe('toQueryStringQuery', () => {
      test('should return the string representation of the wildcard literal', () => {
        const node = buildNode('my_value', 'ig');
        const result = toQueryStringQuery(node);
        expect(result).toBe('/my_value/ig');
      });

      test('should escape query_string query special characters', () => {
        const node = buildNode('+foo');
        const result = toQueryStringQuery(node);
        expect(result).toBe('/\\+foo/');
      });
    });
  });
});
