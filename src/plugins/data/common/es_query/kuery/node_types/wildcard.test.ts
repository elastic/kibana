/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  buildNode,
  wildcardSymbol,
  hasLeadingWildcard,
  toElasticsearchQuery,
  test as testNode,
  toQueryStringQuery,
  // @ts-ignore
} from './wildcard';

describe('kuery node types', () => {
  describe('wildcard', () => {
    describe('buildNode', () => {
      test('should accept a string argument representing a wildcard string', () => {
        const wildcardValue = `foo${wildcardSymbol}bar`;
        const result = buildNode(wildcardValue);

        expect(result).toHaveProperty('type', 'wildcard');
        expect(result).toHaveProperty('value', wildcardValue);
      });

      test('should accept and parse a wildcard string', () => {
        const result = buildNode('foo*bar');

        expect(result).toHaveProperty('type', 'wildcard');
        expect(result.value).toBe(`foo${wildcardSymbol}bar`);
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
  });
});
