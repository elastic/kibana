/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { analyzeMultiMatchTypes } from './query_analysis';
import type {
  QueryDslQueryContainer,
  QueryDslTextQueryType,
} from '@elastic/elasticsearch/lib/api/types';

describe('analyzeMultiMatchTypes', () => {
  describe('basic multi_match query detection', () => {
    it('detects phrase multi_match queries', () => {
      const query: QueryDslQueryContainer = {
        multi_match: {
          type: 'phrase',
          query: 'test query',
          fields: ['field1', 'field2'],
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('match_phrase')).toBe(true);
      expect(result.types.size).toBe(1);
    });

    it('detects best_fields multi_match queries', () => {
      const query: QueryDslQueryContainer = {
        multi_match: {
          type: 'best_fields',
          query: 'test',
          fields: ['*'],
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('best_fields')).toBe(true);
      expect(result.types.size).toBe(1);
    });

    it('defaults to best_fields when type is not specified', () => {
      const query: QueryDslQueryContainer = {
        multi_match: {
          query: 'test',
          fields: ['field1'],
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('best_fields')).toBe(true);
      expect(result.types.size).toBe(1);
    });

    it('detects phrase_prefix multi_match queries', () => {
      const query: QueryDslQueryContainer = {
        multi_match: {
          type: 'phrase_prefix',
          query: 'test',
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('phrase_prefix')).toBe(true);
    });

    it('detects most_fields multi_match queries', () => {
      const query: QueryDslQueryContainer = {
        multi_match: {
          type: 'most_fields',
          query: 'test',
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('most_fields')).toBe(true);
    });

    it('detects cross_fields multi_match queries', () => {
      const query: QueryDslQueryContainer = {
        multi_match: {
          type: 'cross_fields',
          query: 'test',
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('cross_fields')).toBe(true);
    });

    it('detects bool_prefix multi_match queries', () => {
      const query: QueryDslQueryContainer = {
        multi_match: {
          type: 'bool_prefix',
          query: 'test',
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('bool_prefix')).toBe(true);
    });
  });

  describe('match_phrase query detection', () => {
    it('detects match_phrase queries and normalizes to phrase type', () => {
      const query: QueryDslQueryContainer = {
        match_phrase: {
          message: 'this is a phrase',
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('match_phrase')).toBe(true);
    });
  });

  describe('bool query handling', () => {
    it('detects multi_match queries in bool.must clause', () => {
      const query: QueryDslQueryContainer = {
        bool: {
          must: [
            {
              multi_match: {
                type: 'phrase',
                query: 'test',
              },
            },
          ],
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('match_phrase')).toBe(true);
    });

    it('detects multi_match queries in bool.should clause', () => {
      const query: QueryDslQueryContainer = {
        bool: {
          should: [
            {
              multi_match: {
                type: 'best_fields',
                query: 'test',
              },
            },
          ],
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('best_fields')).toBe(true);
    });

    it('detects multi_match queries in bool.filter clause', () => {
      const query: QueryDslQueryContainer = {
        bool: {
          filter: [
            {
              multi_match: {
                query: 'test',
              },
            },
          ],
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('best_fields')).toBe(true);
    });

    it('detects multi_match queries in bool.must_not clause', () => {
      const query: QueryDslQueryContainer = {
        bool: {
          must_not: [
            {
              multi_match: {
                type: 'phrase',
                query: 'test',
              },
            },
          ],
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('match_phrase')).toBe(true);
    });

    it('handles mixed query types in a bool query', () => {
      const query: QueryDslQueryContainer = {
        bool: {
          should: [
            {
              multi_match: {
                type: 'phrase',
                query: 'foo bar',
              },
            },
            {
              multi_match: {
                type: 'best_fields',
                query: 'baz',
              },
            },
          ],
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('match_phrase')).toBe(true);
      expect(result.types.has('best_fields')).toBe(true);
      expect(result.types.size).toBe(2);
    });

    it('handles nested bool queries with multiple levels', () => {
      const query: QueryDslQueryContainer = {
        bool: {
          must: [
            {
              bool: {
                should: [
                  {
                    multi_match: {
                      type: 'phrase',
                      query: 'test1',
                    },
                  },
                  {
                    multi_match: {
                      type: 'phrase_prefix',
                      query: 'test2',
                    },
                  },
                ],
              },
            },
            {
              multi_match: {
                type: 'best_fields',
                query: 'test3',
              },
            },
          ],
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('match_phrase')).toBe(true);
      expect(result.types.has('phrase_prefix')).toBe(true);
      expect(result.types.has('best_fields')).toBe(true);
      expect(result.types.size).toBe(3);
    });

    it('handles bool clauses with single query objects (non-array)', () => {
      const query: QueryDslQueryContainer = {
        bool: {
          must: {
            multi_match: {
              type: 'phrase',
              query: 'test',
            },
          },
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('match_phrase')).toBe(true);
    });
  });

  describe('nested query handling', () => {
    it('detects multi_match queries within nested queries', () => {
      const query: QueryDslQueryContainer = {
        nested: {
          path: 'user',
          query: {
            multi_match: {
              type: 'phrase',
              query: 'test',
            },
          },
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('match_phrase')).toBe(true);
    });

    it('handles nested queries with bool queries inside', () => {
      const query: QueryDslQueryContainer = {
        nested: {
          path: 'comments',
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    type: 'phrase',
                    query: 'comment text',
                  },
                },
              ],
            },
          },
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('match_phrase')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns empty result for undefined query', () => {
      const result = analyzeMultiMatchTypes(undefined);

      expect(result.types.size).toBe(0);
    });

    it('returns empty result for null query', () => {
      const result = analyzeMultiMatchTypes(null as unknown as QueryDslQueryContainer);

      expect(result.types.size).toBe(0);
    });

    it('returns empty result for empty object query', () => {
      const result = analyzeMultiMatchTypes({});

      expect(result.types.size).toBe(0);
    });

    it('handles queries with only term queries (no multi_match)', () => {
      const query: QueryDslQueryContainer = {
        bool: {
          must: [
            {
              term: {
                status: 'active',
              },
            },
            {
              range: {
                age: { gte: 18 },
              },
            },
          ],
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.size).toBe(0);
    });

    it('handles queries with match queries (not multi_match)', () => {
      const query: QueryDslQueryContainer = {
        match: {
          message: 'test',
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.size).toBe(0);
    });

    it('does not count duplicate types multiple times in the set', () => {
      const query: QueryDslQueryContainer = {
        bool: {
          should: [
            {
              multi_match: {
                type: 'phrase',
                query: 'test1',
              },
            },
            {
              multi_match: {
                type: 'phrase',
                query: 'test2',
              },
            },
            {
              multi_match: {
                type: 'phrase',
                query: 'test3',
              },
            },
          ],
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('match_phrase')).toBe(true);
      expect(result.types.size).toBe(1); // Only one unique type
    });
  });

  describe('all multi_match types coverage', () => {
    it('can detect all Elasticsearch multi_match types in a single query', () => {
      const query: QueryDslQueryContainer = {
        bool: {
          should: [
            { multi_match: { type: 'best_fields', query: 'test1' } },
            { multi_match: { type: 'most_fields', query: 'test2' } },
            { multi_match: { type: 'cross_fields', query: 'test3' } },
            { multi_match: { type: 'phrase', query: 'test4' } },
            { multi_match: { type: 'phrase_prefix', query: 'test5' } },
            { multi_match: { type: 'bool_prefix', query: 'test6' } },
          ],
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('best_fields')).toBe(true);
      expect(result.types.has('most_fields')).toBe(true);
      expect(result.types.has('cross_fields')).toBe(true);
      expect(result.types.has('match_phrase')).toBe(true);
      expect(result.types.has('phrase_prefix')).toBe(true);
      expect(result.types.has('bool_prefix')).toBe(true);
      expect(result.types.size).toBe(6);
    });
  });

  describe('performance benchmarks', () => {
    it('analyzes simple query in under 5ms', () => {
      const query: QueryDslQueryContainer = {
        multi_match: {
          type: 'phrase',
          query: 'test',
        },
      };

      const start = performance.now();
      analyzeMultiMatchTypes(query);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5);
    });

    it('analyzes complex nested query in under 5ms', () => {
      const query: QueryDslQueryContainer = {
        bool: {
          must: [
            {
              bool: {
                should: [
                  { multi_match: { type: 'phrase', query: 'test1' } },
                  { multi_match: { type: 'best_fields', query: 'test2' } },
                  { multi_match: { type: 'phrase_prefix', query: 'test3' } },
                ],
              },
            },
            {
              bool: {
                must: [
                  { multi_match: { type: 'most_fields', query: 'test4' } },
                  {
                    nested: {
                      path: 'user',
                      query: {
                        multi_match: {
                          type: 'cross_fields',
                          query: 'test5',
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      const start = performance.now();
      analyzeMultiMatchTypes(query);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5);
    });

    it('analyzes very large query with many clauses in under 5ms', () => {
      const shouldClauses: QueryDslQueryContainer[] = Array.from({ length: 50 }, (_, i) => {
        const queryType: QueryDslTextQueryType = i % 2 === 0 ? 'phrase' : 'best_fields';
        return {
          multi_match: {
            type: queryType,
            query: `test${i}`,
          },
        } as QueryDslQueryContainer;
      });

      const query: QueryDslQueryContainer = {
        bool: {
          should: shouldClauses,
        },
      };

      const start = performance.now();
      analyzeMultiMatchTypes(query);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5);
    });
  });

  describe('real-world query patterns', () => {
    it('handles typical Discover free-text search query', () => {
      // This mirrors what KQL generates for a quoted search
      const query: QueryDslQueryContainer = {
        bool: {
          filter: [
            {
              multi_match: {
                type: 'phrase',
                query: 'error message',
                lenient: true,
              },
            },
          ],
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('match_phrase')).toBe(true);
    });

    it('handles typical Discover unquoted search query', () => {
      // This mirrors what KQL generates for an unquoted search
      const query: QueryDslQueryContainer = {
        bool: {
          filter: [
            {
              multi_match: {
                type: 'best_fields',
                query: 'error',
                lenient: true,
              },
            },
          ],
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('best_fields')).toBe(true);
    });

    it('handles complex Discover query with filters and searches', () => {
      const query: QueryDslQueryContainer = {
        bool: {
          must: [
            {
              multi_match: {
                type: 'phrase',
                query: 'user logged in',
                lenient: true,
              },
            },
          ],
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: 'now-15m',
                  lte: 'now',
                },
              },
            },
            {
              term: {
                'event.action': 'login',
              },
            },
          ],
        },
      };

      const result = analyzeMultiMatchTypes(query);

      expect(result.types.has('match_phrase')).toBe(true);
    });
  });
});
