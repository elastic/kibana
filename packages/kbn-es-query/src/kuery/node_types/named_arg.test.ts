/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { nodeTypes } from './index';
import { buildNode, toElasticsearchQuery } from './named_arg';

jest.mock('../grammar');

describe('kuery node types', () => {
  describe('named arg', () => {
    describe('buildNode', () => {
      test('should return a node representing a named argument with the given value', () => {
        const result = buildNode('fieldName', 'foo');
        expect(result).toHaveProperty('type', 'namedArg');
        expect(result).toHaveProperty('name', 'fieldName');
        expect(result).toHaveProperty('value');

        const literalValue = result.value;
        expect(literalValue).toHaveProperty('type', 'literal');
        expect(literalValue).toHaveProperty('value', 'foo');
      });

      test('should support literal nodes as values', () => {
        const value = nodeTypes.literal.buildNode('foo');
        const result = buildNode('fieldName', value);

        expect(result.value).toBe(value);
        expect(result.value).toEqual(value);
      });
    });

    describe('toElasticsearchQuery', () => {
      test('should return the argument value represented by the given node', () => {
        const node = buildNode('fieldName', 'foo');
        const result = toElasticsearchQuery(node);

        expect(result).toBe('foo');
      });
    });
  });
});
