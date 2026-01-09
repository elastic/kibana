/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  analyzeEsqlMatchFunctions,
  analyzeEsqlMatchRequest,
  mergeEsqlMatchAnalyses,
  type EsqlMatchAnalysis,
} from './esql_query_analysis_utils';

describe('analyzeEsqlMatchFunctions', () => {
  describe('MATCH and MATCH_PHRASE detection', () => {
    it('should detect single MATCH function', () => {
      const query = 'FROM logs | WHERE MATCH(message, "error")';
      const result = analyzeEsqlMatchFunctions(query);

      expect(result.phraseQueryCount).toBe(0);
      expect(result.matchTypes).toEqual(['match']);
    });

    it('should detect multiple MATCH functions in boolean expressions', () => {
      const query =
        'FROM logs | WHERE (MATCH(message, "error") OR MATCH(message, "fatal")) AND status > 400';
      const result = analyzeEsqlMatchFunctions(query);

      expect(result.phraseQueryCount).toBe(0);
      expect(result.matchTypes).toEqual(['match', 'match']);
    });

    it('should detect single MATCH_PHRASE and increment phrase count', () => {
      const query = 'FROM logs | WHERE MATCH_PHRASE(message, "connection timeout")';
      const result = analyzeEsqlMatchFunctions(query);

      expect(result.phraseQueryCount).toBe(1);
      expect(result.matchTypes).toEqual(['match_phrase']);
    });

    it('should correctly count phrase queries in mixed MATCH/MATCH_PHRASE scenarios', () => {
      const query =
        'FROM logs | WHERE MATCH(message, "error") AND MATCH_PHRASE(host, "prod server") AND MATCH_PHRASE(category, "security")';
      const result = analyzeEsqlMatchFunctions(query);

      expect(result.phraseQueryCount).toBe(2); // Only MATCH_PHRASE functions
      expect(result.matchTypes).toEqual(['match', 'match_phrase', 'match_phrase']);
    });

    it('should treat MATCH with operator option as regular match (not phrase)', () => {
      const query =
        'FROM logs | WHERE MATCH(message, "error", {"operator": "AND"}) AND MATCH_PHRASE(host, "server1")';
      const result = analyzeEsqlMatchFunctions(query);

      expect(result.phraseQueryCount).toBe(1); // Only MATCH_PHRASE counts
      expect(result.matchTypes).toEqual(['match', 'match_phrase']);
    });
  });

  describe('Complex query scenarios', () => {
    it('should detect MATCH functions across multiple ES|QL commands', () => {
      const query = `
        FROM logs
        | WHERE MATCH(message, "error")
        | EVAL is_timeout = MATCH_PHRASE(message, "connection timeout")
        | STATS error_count = COUNT() BY host
      `;
      const result = analyzeEsqlMatchFunctions(query);

      expect(result.phraseQueryCount).toBe(1);
      expect(result.matchTypes).toEqual(['match', 'match_phrase']);
    });

    it('should handle real-world production-like query', () => {
      const query = `
        FROM logs-*, metrics-*
        | WHERE MATCH(message, "error")
          AND MATCH_PHRASE(host, "prod server")
          AND status > 400
        | EVAL is_critical = MATCH(severity, "critical")
        | WHERE is_critical OR MATCH_PHRASE(category, "security alert")
        | STATS error_count = COUNT(), avg_response = AVG(response_time) BY host, level
        | WHERE error_count > 100
        | LIMIT 50
      `;
      const result = analyzeEsqlMatchFunctions(query);

      expect(result.phraseQueryCount).toBe(2); // 2x MATCH_PHRASE
      expect(result.matchTypes).toEqual(['match', 'match_phrase', 'match', 'match_phrase']);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty and invalid queries gracefully', () => {
      expect(analyzeEsqlMatchFunctions('')).toEqual({
        phraseQueryCount: 0,
        matchTypes: [],
      });
      expect(analyzeEsqlMatchFunctions('INVALID SYNTAX;;;')).toEqual({
        phraseQueryCount: 0,
        matchTypes: [],
      });
    });

    it('should return empty result for queries without MATCH functions', () => {
      const query = 'FROM logs | WHERE status > 400 | STATS count = COUNT() BY level';
      const result = analyzeEsqlMatchFunctions(query);

      expect(result.phraseQueryCount).toBe(0);
      expect(result.matchTypes).toEqual([]);
    });
  });

  describe('Performance', () => {
    it('should analyze complex production query in <10ms', () => {
      const query = `
        FROM logs, logs-*
        | WHERE MATCH(message, "error")
          AND MATCH_PHRASE(host, "prod server")
          AND MATCH(level, "error", {"operator": "AND"})
        | EVAL is_critical = MATCH(severity, "critical")
        | WHERE is_critical OR MATCH_PHRASE(category, "security alert")
        | STATS error_count = COUNT(), unique_hosts = COUNT_DISTINCT(host) BY host, level
        | WHERE error_count > 100
        | SORT error_count DESC
        | LIMIT 50
      `;

      const start = performance.now();
      analyzeEsqlMatchFunctions(query);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });
  });
});

describe('analyzeEsqlMatchRequest', () => {
  it('should analyze valid ES|QL request and extract MATCH functions', () => {
    const request = {
      id: 'test-request-1',
      json: {
        query: 'FROM logs | WHERE MATCH(message, "error") AND MATCH_PHRASE(host, "server1")',
      },
    } as never;

    const result = analyzeEsqlMatchRequest(request);

    expect(result.phraseQueryCount).toBe(1);
    expect(result.matchTypes).toEqual(['match', 'match_phrase']);
  });

  it('should return empty result for non-ES|QL requests', () => {
    const queryDslRequest = {
      id: 'test-request-dsl',
      json: {
        query: { bool: { must: [] } }, // Query DSL object, not ES|QL string
      },
    } as never;

    const noQueryRequest = {
      id: 'test-request-no-query',
      json: { size: 100, from: 0 },
    } as never;

    expect(analyzeEsqlMatchRequest(queryDslRequest)).toEqual({
      phraseQueryCount: 0,
      matchTypes: [],
    });
    expect(analyzeEsqlMatchRequest(noQueryRequest)).toEqual({
      phraseQueryCount: 0,
      matchTypes: [],
    });
  });
});

describe('mergeEsqlMatchAnalyses', () => {
  it('should correctly merge multiple analyses by summing counts and concatenating types', () => {
    const analysis1: EsqlMatchAnalysis = {
      phraseQueryCount: 2,
      matchTypes: ['match', 'match_phrase', 'match_phrase'],
    };

    const analysis2: EsqlMatchAnalysis = {
      phraseQueryCount: 0,
      matchTypes: ['match'],
    };

    const analysis3: EsqlMatchAnalysis = {
      phraseQueryCount: 1,
      matchTypes: ['match_phrase'],
    };

    const result = mergeEsqlMatchAnalyses([analysis1, analysis2, analysis3]);

    expect(result.phraseQueryCount).toBe(3); // 2 + 0 + 1
    expect(result.matchTypes).toEqual([
      'match',
      'match_phrase',
      'match_phrase',
      'match',
      'match_phrase',
    ]);
  });

  it('should handle empty array by returning zero counts', () => {
    const result = mergeEsqlMatchAnalyses([]);

    expect(result.phraseQueryCount).toBe(0);
    expect(result.matchTypes).toEqual([]);
  });
});
