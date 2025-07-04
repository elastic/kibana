/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type KqlWildcardNode,
  KQL_NODE_TYPE_WILDCARD,
  KQL_WILDCARD_SYMBOL,
  buildNode,
  hasLeadingWildcard,
  test as testNode,
  toElasticsearchQuery,
  toKqlExpression,
  toQueryStringQuery,
} from './wildcard';

describe('kuery node types', () => {
  describe('wildcard', () => {
    describe('buildNode', () => {
      test('should accept a string argument representing a wildcard string', () => {
        const wildcardValue = `foo${KQL_WILDCARD_SYMBOL}bar`;
        const result = buildNode(wildcardValue);

        expect(result).toHaveProperty('type', KQL_NODE_TYPE_WILDCARD);
        expect(result).toHaveProperty('value', wildcardValue);
      });

      test('should accept and parse a wildcard string', () => {
        const result = buildNode('foo*bar');

        expect(result).toHaveProperty('type', KQL_NODE_TYPE_WILDCARD);
        expect(result.value).toBe(`foo${KQL_WILDCARD_SYMBOL}bar`);
      });
    });

    describe('toElasticsearchQuery', () => {
      test('should return the string representation of the wildcard literal', () => {
        const node = buildNode('foo*bar');
        const result = toElasticsearchQuery(node);

        expect(result).toBe('foo*bar');
      });
    });

    describe('toQueryStringQuery', () => {
      test('should return the string representation of the wildcard literal', () => {
        const node = buildNode('foo*bar');
        const result = toQueryStringQuery(node);

        expect(result).toBe('foo*bar');
      });

      test('should escape query_string query special characters other than wildcard', () => {
        const node = buildNode('+foo*bar');
        const result = toQueryStringQuery(node);

        expect(result).toBe('\\+foo*bar');
      });
    });

    describe('test', () => {
      test('should return a boolean indicating whether the string matches the given wildcard node', () => {
        const node = buildNode('foo*bar');

        expect(testNode(node, 'foobar')).toBe(true);
        expect(testNode(node, 'foobazbar')).toBe(true);
        expect(testNode(node, 'foobar')).toBe(true);
        expect(testNode(node, 'fooqux')).toBe(false);
        expect(testNode(node, 'bazbar')).toBe(false);
      });

      test('should return a true even when the string has newlines or tabs', () => {
        const node = buildNode('foo*bar');

        expect(testNode(node, 'foo\nbar')).toBe(true);
        expect(testNode(node, 'foo\tbar')).toBe(true);
      });
    });

    describe('hasLeadingWildcard', () => {
      test('should determine whether a wildcard node contains a leading wildcard', () => {
        const node = buildNode('foo*bar');
        expect(hasLeadingWildcard(node)).toBe(false);

        const leadingWildcardNode = buildNode('*foobar');
        expect(hasLeadingWildcard(leadingWildcardNode)).toBe(true);
      });

      // Lone wildcards become exists queries, so we aren't worried about their performance
      test('should not consider a lone wildcard to be a leading wildcard', () => {
        const leadingWildcardNode = buildNode('*');

        expect(hasLeadingWildcard(leadingWildcardNode)).toBe(false);
      });
    });

    describe('toKqlExpression', () => {
      test('should return the string representation of the wildcard literal', () => {
        const node: KqlWildcardNode = {
          type: 'wildcard',
          value: 'foo*bar@kuery-wildcard@baz',
        };
        const result = toKqlExpression(node);
        expect(result).toBe('foo\\*bar*baz');
      });
    });
  });
});
