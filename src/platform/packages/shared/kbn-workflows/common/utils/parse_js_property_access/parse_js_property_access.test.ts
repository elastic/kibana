/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseJsPropertyAccess } from './parse_js_property_access';

describe('parseJsPropertyAccess', () => {
  describe('simple dot notation', () => {
    it('should parse a simple property access', () => {
      expect(parseJsPropertyAccess('user')).toEqual(['user']);
    });

    it('should parse nested properties with dot notation', () => {
      expect(parseJsPropertyAccess('user.profile.name')).toEqual(['user', 'profile', 'name']);
    });

    it('should parse deeply nested properties', () => {
      expect(parseJsPropertyAccess('a.b.c.d.e.f')).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    });
  });

  describe('bracket notation', () => {
    it('should parse single bracket access with number', () => {
      expect(parseJsPropertyAccess('data[0]')).toEqual(['data', '0']);
    });

    it('should parse single bracket access with string key', () => {
      expect(parseJsPropertyAccess("data['key']")).toEqual(['data', 'key']);
    });

    it('should parse single bracket access with double quoted string', () => {
      expect(parseJsPropertyAccess('data["key"]')).toEqual(['data', 'key']);
    });

    it('should parse multiple consecutive bracket accesses', () => {
      expect(parseJsPropertyAccess('data[0][1]')).toEqual(['data', '0', '1']);
    });
  });

  describe('mixed notation', () => {
    it('should parse dot notation followed by bracket notation', () => {
      expect(parseJsPropertyAccess('user.data[0]')).toEqual(['user', 'data', '0']);
    });

    it('should parse bracket notation followed by dot notation', () => {
      expect(parseJsPropertyAccess('data[0].name')).toEqual(['data', '0', 'name']);
    });

    it('should parse complex mixed notation', () => {
      expect(parseJsPropertyAccess("data[0].items['key'].value")).toEqual([
        'data',
        '0',
        'items',
        'key',
        'value',
      ]);
    });

    it('should parse the example from JSDoc', () => {
      expect(parseJsPropertyAccess("data[0].items['key']")).toEqual(['data', '0', 'items', 'key']);
    });

    it('should parse another complex example', () => {
      expect(parseJsPropertyAccess('a.b[1].c')).toEqual(['a', 'b', '1', 'c']);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(parseJsPropertyAccess('')).toEqual([]);
    });

    it('should handle single dot', () => {
      expect(parseJsPropertyAccess('.')).toEqual([]);
    });

    it('should handle multiple consecutive dots', () => {
      expect(parseJsPropertyAccess('a..b')).toEqual(['a', 'b']);
    });

    it('should handle leading dot', () => {
      expect(parseJsPropertyAccess('.property')).toEqual(['property']);
    });

    it('should handle trailing dot', () => {
      expect(parseJsPropertyAccess('property.')).toEqual(['property']);
    });

    it('should handle empty brackets', () => {
      expect(parseJsPropertyAccess('data[]')).toEqual(['data']);
    });

    it('should handle brackets with spaces', () => {
      expect(parseJsPropertyAccess('data[ 0 ]')).toEqual(['data', ' 0 ']);
    });

    it('should handle complex string keys with special characters', () => {
      expect(parseJsPropertyAccess("data['key-with-dashes']")).toEqual(['data', 'key-with-dashes']);
    });

    it('should handle nested quotes in bracket notation', () => {
      expect(parseJsPropertyAccess('data["key\'s value"]')).toEqual(['data', "key's value"]);
    });

    it('should handle numbers as property names', () => {
      expect(parseJsPropertyAccess('data.123.value')).toEqual(['data', '123', 'value']);
    });
  });

  describe('realistic use cases', () => {
    it('should parse user profile access', () => {
      expect(parseJsPropertyAccess('user.profile.firstName')).toEqual([
        'user',
        'profile',
        'firstName',
      ]);
    });

    it('should parse array element access', () => {
      expect(parseJsPropertyAccess('orders[0].items[1].name')).toEqual([
        'orders',
        '0',
        'items',
        '1',
        'name',
      ]);
    });

    it('should parse configuration object access', () => {
      expect(parseJsPropertyAccess("config['database']['host']")).toEqual([
        'config',
        'database',
        'host',
      ]);
    });

    it('should parse API response structure', () => {
      expect(parseJsPropertyAccess('response.data.results[0].attributes.title')).toEqual([
        'response',
        'data',
        'results',
        '0',
        'attributes',
        'title',
      ]);
    });

    it('should parse form field access', () => {
      expect(parseJsPropertyAccess("form['user-details']['contact-info'].email")).toEqual([
        'form',
        'user-details',
        'contact-info',
        'email',
      ]);
    });
  });

  describe('potential parser edge cases', () => {
    it('should handle bracket notation at the beginning', () => {
      expect(parseJsPropertyAccess('[0].property')).toEqual(['0', 'property']);
    });

    it('should handle mixed quotes in consecutive brackets', () => {
      expect(parseJsPropertyAccess('data["key1"][\'key2\']')).toEqual(['data', 'key1', 'key2']);
    });

    it('should handle property names that look like array indices', () => {
      expect(parseJsPropertyAccess('obj.0.property')).toEqual(['obj', '0', 'property']);
    });
  });
});
