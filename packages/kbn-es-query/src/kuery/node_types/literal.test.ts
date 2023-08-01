/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildNode, KQL_NODE_TYPE_LITERAL, toElasticsearchQuery, toKqlExpression } from './literal';

jest.mock('../grammar');

describe('kuery node types', () => {
  describe('literal', () => {
    describe('buildNode', () => {
      test('should return a node representing the given value', () => {
        const result = buildNode('foo');

        expect(result).toHaveProperty('type', KQL_NODE_TYPE_LITERAL);
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

    describe('toKqlExpression', () => {
      test('unquoted', () => {
        const node = buildNode('foo');
        const result = toKqlExpression(node);
        expect(result).toBe('foo');
      });

      test('quoted', () => {
        const node = buildNode('foo', true);
        const result = toKqlExpression(node);
        expect(result).toBe('"foo"');
      });

      test('reserved chars', () => {
        const node = buildNode('():<>"*');
        const result = toKqlExpression(node);
        expect(result).toBe('\\(\\)\\:\\<\\>\\"\\*');
      });

      test('reserved keywords', () => {
        const node = buildNode('foo and bar not baz or qux');
        const result = toKqlExpression(node);
        expect(result).toBe('foo \\and bar \\not baz \\or qux');
      });

      test('quoted with escaped quotes', () => {
        const node = buildNode(`I said, "Hello."`, true);
        const result = toKqlExpression(node);
        expect(result).toBe(`"I said, \\"Hello.\\""`);
      });
    });
  });
});
