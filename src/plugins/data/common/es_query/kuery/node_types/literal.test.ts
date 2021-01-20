/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// @ts-ignore
import { buildNode, toElasticsearchQuery } from './literal';

describe('kuery node types', () => {
  describe('literal', () => {
    describe('buildNode', () => {
      test('should return a node representing the given value', () => {
        const result = buildNode('foo');

        expect(result).toHaveProperty('type', 'literal');
        expect(result).toHaveProperty('value', 'foo');
      });
    });

    describe('toElasticsearchQuery', () => {
      test('should return the literal value represented by the given node', () => {
        const node = buildNode('foo');
        const result = toElasticsearchQuery(node);

        expect(result).toBe('foo');
      });
    });
  });
});
