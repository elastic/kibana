/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRecommendedQueriesTemplatesFromExtensions } from '.';
import type { RecommendedQuery } from '@kbn/esql-types';

describe('getRecommendedQueriesTemplatesFromExtensions', () => {
  it('should return empty array for empty input', () => {
    const result = getRecommendedQueriesTemplatesFromExtensions([]);
    expect(result).toEqual([]);
  });

  it('should return empty array for undefined input', () => {
    const result = getRecommendedQueriesTemplatesFromExtensions(undefined as any);
    expect(result).toEqual([]);
  });

  it('should return empty template for simple FROM query', () => {
    const queries: RecommendedQuery[] = [
      {
        name: 'All metrics',
        query: 'FROM metrics-*',
        description: 'Lists all metrics',
      },
    ];

    const result = getRecommendedQueriesTemplatesFromExtensions(queries);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      label: 'All metrics',
      text: '',
      detail: 'All metrics',
      documentation: { value: 'Lists all metrics' },
      kind: 'Issue',
      sortText: 'D',
    });
  });

  it('should extract template from query with additional commands', () => {
    const queries: RecommendedQuery[] = [
      {
        name: 'Kubernetes pods by memory',
        query:
          'FROM metrics-* | WHERE kubernetes.pod.memory.usage.limit.pct IS NOT NULL | STATS memory_limit_pct = MAX(kubernetes.pod.memory.usage.limit.pct) BY kubernetes.pod.name | SORT memory_limit_pct DESC',
        description: 'Lists Kubernetes pods sorted by memory usage',
      },
    ];

    const result = getRecommendedQueriesTemplatesFromExtensions(queries);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Kubernetes pods by memory');
    expect(result[0].text).toContain('| WHERE kubernetes.pod.memory.usage.limit.pct IS NOT NULL');
    expect(result[0].text).toContain('| STATS memory_limit_pct');
    expect(result[0].text).toContain('| SORT memory_limit_pct DESC');
    expect(result[0].detail).toBe('Kubernetes pods by memory');
    expect(result[0].documentation).toEqual({
      value: 'Lists Kubernetes pods sorted by memory usage',
    });
  });

  it('should handle query with empty pipe segments', () => {
    const queries: RecommendedQuery[] = [
      {
        name: 'Query with empty pipes',
        query: 'FROM logs-* | | WHERE message IS NOT NULL',
        description: 'Test query',
      },
    ];

    const result = getRecommendedQueriesTemplatesFromExtensions(queries);

    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('| WHERE message IS NOT NULL');
  });

  it('should handle multiple queries with mixed complexity', () => {
    const queries: RecommendedQuery[] = [
      {
        name: 'Simple query',
        query: 'FROM metrics-*',
        description: 'Simple FROM query',
      },
      {
        name: 'Complex query',
        query: 'FROM logs-* | WHERE QSTR("error") | STATS count = COUNT(*) BY host.name',
        description: 'Complex query with multiple commands',
      },
    ];

    const result = getRecommendedQueriesTemplatesFromExtensions(queries);

    expect(result).toHaveLength(2);

    // First query (simple) should have empty template
    expect(result[0].label).toBe('Simple query');
    expect(result[0].text).toBe('');

    // Second query (complex) should have extracted template
    expect(result[1].label).toBe('Complex query');
    expect(result[1].text).toContain('| WHERE QSTR("error")');
    expect(result[1].text).toContain('| STATS count = COUNT(*) BY host.name');
  });

  it('should handle query without description', () => {
    const queries: RecommendedQuery[] = [
      {
        name: 'No description query',
        query: 'FROM metrics-* | LIMIT 10',
      },
    ];

    const result = getRecommendedQueriesTemplatesFromExtensions(queries);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('No description query');
    expect(result[0].detail).toBe('No description query');
    expect(result[0].documentation).toBeUndefined();
    expect(result[0].text).toContain('| LIMIT 10');
  });

  it('should handle query with only whitespace after FROM', () => {
    const queries: RecommendedQuery[] = [
      {
        name: 'Whitespace query',
        query: 'FROM metrics-* |   |   ',
        description: 'Query with only whitespace pipes',
      },
    ];

    const result = getRecommendedQueriesTemplatesFromExtensions(queries);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('');
  });

  it('should set correct default properties for all results', () => {
    const queries: RecommendedQuery[] = [
      {
        name: 'Test query',
        query: 'FROM metrics-* | LIMIT 5',
        description: 'Test description',
      },
    ];

    const result = getRecommendedQueriesTemplatesFromExtensions(queries);

    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('Issue');
    expect(result[0].sortText).toBe('D');
  });

  it('should handle query with complex index pattern without additional commands', () => {
    const queries: RecommendedQuery[] = [
      {
        name: 'Complex index pattern',
        query: 'FROM metrics-hostmetricsreceiver.otel-default',
        description: 'Query with complex index pattern',
      },
    ];

    const result = getRecommendedQueriesTemplatesFromExtensions(queries);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      label: 'Complex index pattern',
      text: '', // Should be empty, not '\n|'
      detail: 'Complex index pattern',
      documentation: { value: 'Query with complex index pattern' },
      kind: 'Issue',
      sortText: 'D',
    });
  });
});
