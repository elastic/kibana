/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { evaluateExpression } from './evaluate_expression';

describe('evaluateExpression', () => {
  describe('string manipulation', () => {
    it('should evaluate split filter over string', () => {
      const template = `{{ "foo,bar,dak" | split: "," }}`;
      const actual = evaluateExpression(template, {});
      expect(actual).toEqual(['foo', 'bar', 'dak']);
    });

    it('should evaluate split filter over variable', () => {
      const template = `{{ my_string | split: "," }}`;
      const actual = evaluateExpression(template, {
        my_string: 'foo,bar,dak',
      });
      expect(actual).toEqual(['foo', 'bar', 'dak']);
    });

    it('should evaluate split filter with variable separator', () => {
      const template = `{{ my_string | split: separator }}`;
      const actual = evaluateExpression(template, {
        my_string: 'foo|bar|dak',
        separator: '|',
      });
      expect(actual).toEqual(['foo', 'bar', 'dak']);
    });
  });

  describe('array manipulation', () => {
    it('should evaluate join filter over array', () => {
      const template = `{{ my_array | join: "," }}`;
      const actual = evaluateExpression(template, {
        my_array: ['foo', 'bar', 'dak'],
      });
      expect(actual).toEqual('foo,bar,dak');
    });

    it('should evaluate join filter with variable separator', () => {
      const template = `{{ my_array | join: separator }}`;
      const actual = evaluateExpression(template, {
        my_array: ['foo', 'bar', 'dak'],
        separator: '|',
      });
      expect(actual).toEqual('foo|bar|dak');
    });
  });

  describe('object manipulation', () => {
    it('should evaluate to key value array', () => {
      const template = `{{ my_object | to_key_value: "foo" }}`;
      const actual = evaluateExpression(template, {
        my_object: { foo: 'bar', dak: 'baz', zap: 'zop' },
      });
      expect(actual).toEqual([
        { key: 'foo', value: 'bar' },
        { key: 'dak', value: 'baz' },
        { key: 'zap', value: 'zop' },
      ]);
    });
  });
});
