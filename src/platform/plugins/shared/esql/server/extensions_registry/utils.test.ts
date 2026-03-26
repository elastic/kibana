/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { RecommendedQuery, ResolveIndexResponse } from '@kbn/esql-types';
import { findMatchingIndicesFromPattern, checkSourceExistence } from './utils';

describe('Extensions registry utils', () => {
  describe('checkSourceExistence', () => {
    let mockSources: ResolveIndexResponse;

    beforeEach(() => {
      mockSources = {
        indices: [
          { name: 'bike-hire-stations' },
          { name: 'logs-apache_error' },
          { name: 'logs-aws_s3' },
          { name: 'remote_cluster:metrics-1' },
          { name: 'logstash-0' },
          { name: 'logstash-1' },
          { name: 'movies' },
          { name: 'finance-data-2024' },
        ],
        aliases: [
          { name: '.alerts-default.alerts-default' },
          { name: '.siem-signals-default' },
          { name: 'my_data_alias' },
        ],
        data_streams: [
          {
            name: 'kibana_sample_data_logs',
          },
          {
            name: 'logs-apm.error-default',
          },
          {
            name: 'metrics-system.cpu-default',
          },
          {
            name: 'user-activity-stream',
          },
        ],
      };
    });

    // --- Test cases for single search terms ---

    test('should return true for an exact match in indices', () => {
      expect(checkSourceExistence(mockSources, 'movies')).toBe(true);
    });

    test('should return true for an exact match in remote indices', () => {
      expect(checkSourceExistence(mockSources, 'remote_cluster:metrics-1')).toBe(true);
    });

    test('should return true for a wildcard match in indices (ending with *)', () => {
      expect(checkSourceExistence(mockSources, 'logs-apache*')).toBe(true);
    });

    test('should return true for a wildcard match in remote indices (ending with *)', () => {
      expect(checkSourceExistence(mockSources, 'remote_cluster:metrics*')).toBe(true);
    });

    test('should return true for a wildcard match in indices (ending with -*)', () => {
      expect(checkSourceExistence(mockSources, 'logstash-*')).toBe(true);
    });

    test('should return true for an exact match in aliases', () => {
      expect(checkSourceExistence(mockSources, '.siem-signals-default')).toBe(true);
    });

    test('should return true for a wildcard match in aliases (ending with *)', () => {
      expect(checkSourceExistence(mockSources, '.alerts-default*')).toBe(true);
    });

    test('should return true for a wildcard match in aliases (ending with -*)', () => {
      expect(checkSourceExistence(mockSources, 'my_data_alias')).toBe(true); // Exact match, but testing if logic handles non-wildcard
      expect(checkSourceExistence(mockSources, 'my_data*')).toBe(true); // Wildcard for my_data_alias
    });

    test('should return true for an exact match in data_streams', () => {
      expect(checkSourceExistence(mockSources, 'kibana_sample_data_logs')).toBe(true);
    });

    test('should return true for a wildcard match in data_streams (ending with *)', () => {
      expect(checkSourceExistence(mockSources, 'metrics-system*')).toBe(true);
    });

    test('should return true for a wildcard match in data_streams (ending with -*)', () => {
      expect(checkSourceExistence(mockSources, 'logs-apm.error-*')).toBe(true);
    });

    test('should return false if a single search term is not found anywhere', () => {
      expect(checkSourceExistence(mockSources, 'nonexistent-source')).toBe(false);
    });

    test('should return false if a wildcard search term finds no match', () => {
      expect(checkSourceExistence(mockSources, 'no-match*')).toBe(false);
    });

    test('should distinguish between exact match and wildcard for same prefix', () => {
      expect(checkSourceExistence(mockSources, 'movies')).toBe(true); // Exact
      expect(checkSourceExistence(mockSources, 'mov*')).toBe(true); // Wildcard
      expect(checkSourceExistence(mockSources, 'movie-logs')).toBe(false); // Does not exist
    });

    // --- Test cases for comma-separated search terms ---

    test('should return true if all comma-separated terms are found', () => {
      expect(
        checkSourceExistence(mockSources, 'movies, logs-apache_error, metrics-system.cpu-default')
      ).toBe(true);
    });

    test('should return true if all comma-separated terms including wildcards are found', () => {
      expect(
        checkSourceExistence(
          mockSources,
          'movies, logs-*, .alerts-default.alerts-default, user-activity*'
        )
      ).toBe(true);
    });

    test('should return false if at least one comma-separated term is not found', () => {
      expect(
        checkSourceExistence(mockSources, 'movies, nonexistent, metrics-system.cpu-default')
      ).toBe(false);
    });

    test('should handle leading/trailing spaces in comma-separated terms', () => {
      expect(
        checkSourceExistence(mockSources, ' movies ,logstash-0 , .siem-signals-default ')
      ).toBe(true);
    });
  });

  describe('findMatchingIndicesFromPattern', () => {
    let registry: Map<string, RecommendedQuery[]>;

    beforeEach(() => {
      // Initialize a fresh registry for each test
      registry = new Map<string, RecommendedQuery[]>();
      registry.set('oblt>logs-2023-10-01', [
        { name: 'attr1', query: 'from attr1' },
        { name: 'attr2', query: 'from attr2' },
      ]);
      registry.set('oblt>logs-2024-01-15', [
        { name: 'attrA', query: 'from attrA' },
        { name: 'attrB', query: 'from attrB' },
      ]);
      registry.set('oblt>metrics-cpu', [
        { name: 'load', query: 'from load' },
        { name: 'usage', query: 'from usage' },
      ]);
      registry.set('oblt>logs-nginx-access', [
        { name: 'status', query: 'from status' },
        { name: 'bytes', query: 'from bytes' },
      ]);
      registry.set('oblt>my_logs', [{ name: 'logstash', query: 'from logstash' }]);
      registry.set('oblt>data', [{ name: 'data1', query: 'from data1' }]);
      registry.set('oblt>another-logs-index', [{ name: 'info', query: 'from info' }]);
      registry.set('oblt>logs', [{ name: 'plain_logs', query: 'from plain_logs' }]);
      registry.set('oblt>orders-2023-q1', []);
      registry.set('oblt>orders-2023-q2', []);
      registry.set('oblt>errors_123', []);
      registry.set('oblt>errors_abc', []);
      registry.set('oblt>pattern*', [{ name: 'pattern', query: 'from pattern*' }]);
    });

    // Matching with a wildcard at the end (e.g., "logs*")
    test('should return all indices matching a wildcard pattern like "logs*"', () => {
      const result = findMatchingIndicesFromPattern(registry, 'logs*');
      const expected = ['logs-2023-10-01', 'logs-2024-01-15', 'logs-nginx-access', 'logs'].sort(); // Sort for consistent order

      expect(result.sort()).toEqual(expected);
    });

    // Matching with a wildcard in the middle (e.g., "metrics-*")
    test('should return all indices matching a wildcard pattern like "metrics-*"', () => {
      const result = findMatchingIndicesFromPattern(registry, 'metrics-*');
      const expected = ['metrics-cpu'].sort();
      expect(result.sort()).toEqual(expected);
    });

    // Exact match (e.g., "my_logs")
    test('should return the exact index name for an exact match pattern', () => {
      const result = findMatchingIndicesFromPattern(registry, 'my_logs');
      const expected = ['my_logs'].sort();
      expect(result.sort()).toEqual(expected);
    });

    // No matching indices
    test('should return an empty array if no indices match the pattern', () => {
      const result = findMatchingIndicesFromPattern(registry, 'nonexistent*');
      expect(result).toEqual([]);
    });

    // Matching a single character wildcard (e.g., "data*")
    test('should match an index that is just the prefix for a wildcard pattern', () => {
      const result = findMatchingIndicesFromPattern(registry, 'data*');
      expect(result).toEqual(['data']);
    });

    // More specific wildcard match
    test('should correctly match a more specific wildcard like "another-logs-*"', () => {
      const result = findMatchingIndicesFromPattern(registry, 'another-logs-*');
      expect(result).toEqual(['another-logs-index']);
    });

    // Pattern that looks like a regex special character
    test('should correctly handle patterns that contain regex special characters', () => {
      registry.set('my.special.index', []);
      registry.set('my-special-index', []);
      const result = findMatchingIndicesFromPattern(registry, 'my.special.index');
      expect(result).toEqual(['my.special.index']);
    });

    // Empty registry
    test('should return an empty array if the registry is empty', () => {
      const emptyRegistry = new Map<string, RecommendedQuery[]>();
      const result = findMatchingIndicesFromPattern(emptyRegistry, 'logs*');
      expect(result).toEqual([]);
    });

    // Pattern that matches part of the index name
    test('should not match partial names without wildcard', () => {
      const result = findMatchingIndicesFromPattern(registry, 'logs'); // Looking for exact 'logs'
      expect(result).toEqual(['logs']); // Should only return "logs", not "logs-..."
    });

    //  Case sensitivity (assuming patterns are case-sensitive)
    test('should respect case sensitivity', () => {
      registry.set('Logs', []);
      const result = findMatchingIndicesFromPattern(registry, 'logs*');
      const expected = ['logs-2023-10-01', 'logs-2024-01-15', 'logs-nginx-access', 'logs'].sort();
      expect(result.sort()).toEqual(expected); // "Logs" should not be included
    });

    //  Pattern with no wildcard but common prefix
    test('should not match common prefix if no wildcard is used', () => {
      const result = findMatchingIndicesFromPattern(registry, 'orders');
      expect(result).toEqual([]);
    });

    //  Pattern with no wildcard but common prefix and exact match
    test('should match exact pattern even if it has a common prefix with others', () => {
      registry.set('my-order', []);
      const result = findMatchingIndicesFromPattern(registry, 'my-order');
      expect(result).toEqual(['my-order']);
    });

    //  Wildcard with numerical suffix
    test('should match wildcard patterns with numerical suffixes correctly', () => {
      const result = findMatchingIndicesFromPattern(registry, 'errors_*');
      const expected = ['errors_123', 'errors_abc'].sort();
      expect(result.sort()).toEqual(expected);
    });

    //  Matching a pattern that looks like a regex special character
    test('should correctly match a single string that matches a wildcard', () => {
      const result = findMatchingIndicesFromPattern(registry, 'pattern-01022024');
      expect(result).toEqual(['pattern*']);
    });
  });
});
