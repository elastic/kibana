/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { RecommendedQuery, RecommendedField, ResolveIndexResponse } from '@kbn/esql-types';
import { ESQLExtensionsRegistry } from '.';

describe('ESQLExtensionsRegistry', () => {
  let registry: ESQLExtensionsRegistry;
  let availableDatasources: ResolveIndexResponse;

  beforeEach(() => {
    registry = new ESQLExtensionsRegistry();
  });

  // --- setRecommendedQueries tests ---
  describe('setRecommendedQueries', () => {
    beforeEach(() => {
      availableDatasources = {
        indices: [
          { name: 'logs-2023' },
          { name: 'metrics-*' },
          { name: 'my_index' },
          { name: 'another_index' },
        ],
      };
    });
    it('should add recommended queries to the registry', () => {
      const solutionId = 'oblt';
      const queries: RecommendedQuery[] = [
        { name: 'Query 1', query: 'FROM logs-2023 | STATS count()' },
        { name: 'Query 2', query: 'FROM metrics-* | STATS avg(value)' },
      ];

      registry.setRecommendedQueries(queries, solutionId);
      const retrievedQueriesForLogs = registry.getRecommendedQueries(
        'FROM logs-2023',
        availableDatasources,
        solutionId
      );
      expect(retrievedQueriesForLogs).toEqual([queries[0]]);

      const retrievedQueriesForMetrics = registry.getRecommendedQueries(
        'FROM metrics-*',
        availableDatasources,
        solutionId
      );
      expect(retrievedQueriesForMetrics).toEqual([queries[1]]);
    });

    it('should skip malformed recommended queries (missing name or query)', () => {
      const solutionId = 'oblt';
      const queries: RecommendedQuery[] = [
        { name: 'Valid Query', query: 'FROM my_index | STATS count()' },
        { name: 'Missing Query' } as RecommendedQuery, // Malformed
        { query: 'FROM another_index | STATS sum()' } as RecommendedQuery, // Malformed
      ];

      registry.setRecommendedQueries(queries, solutionId);

      // Ensure only the valid query was effectively added
      const retrievedQueries = registry.getRecommendedQueries(
        'FROM my_index',
        availableDatasources,
        solutionId
      );
      expect(retrievedQueries).toEqual([
        { name: 'Valid Query', query: 'FROM my_index | STATS count()' },
      ]);
    });

    it('should skip queries if no index pattern is found from the query string', () => {
      const solutionId = 'es';
      const queries: RecommendedQuery[] = [
        { name: 'Valid Query', query: 'FROM my_index | STATS count()' },
        { name: 'No Pattern Query', query: 'STATS count()' }, // No index pattern, malformed
      ];

      registry.setRecommendedQueries(queries, solutionId);

      // Verify only the query with a pattern was added
      const retrievedQueries = registry.getRecommendedQueries(
        'FROM my_index',
        availableDatasources,
        solutionId
      );
      expect(retrievedQueries).toEqual([
        { name: 'Valid Query', query: 'FROM my_index | STATS count()' },
      ]);

      const retrievedQueriesForNoPattern = registry.getRecommendedQueries(
        'STATS count()',
        availableDatasources,
        solutionId
      );
      expect(retrievedQueriesForNoPattern).toEqual([]);
    });

    it('should not add duplicate recommended queries for the same registryId and query', () => {
      const solutionId = 'es';
      const queryA: RecommendedQuery = {
        name: 'Query A',
        query: 'FROM another_index | STATS count()',
      };
      const queries: RecommendedQuery[] = [queryA, queryA]; // Duplicate entry

      registry.setRecommendedQueries(queries, solutionId);
      const retrievedQueries = registry.getRecommendedQueries(
        'FROM another_index',
        availableDatasources,
        solutionId
      );
      expect(retrievedQueries).toEqual([queryA]);
    });

    it('should handle different solution IDs correctly', () => {
      const query1: RecommendedQuery = { name: 'Q1', query: 'FROM logs* | STATS count()' };
      const query2: RecommendedQuery = { name: 'Q2', query: 'FROM logs* | STATS sum(value)' }; // Same index pattern, different solution

      registry.setRecommendedQueries([query1], 'oblt');
      registry.setRecommendedQueries([query2], 'security');

      // Retrieve for oblst
      const queriesOblt = registry.getRecommendedQueries(
        'FROM logs*',
        availableDatasources,
        'oblt'
      );
      expect(queriesOblt).toEqual([query1]);

      // Retrieve for security
      const queriesSecurity = registry.getRecommendedQueries(
        'FROM logs*',
        availableDatasources,
        'security'
      );
      expect(queriesSecurity).toEqual([query2]);
    });
  });

  // --- getRecommendedQueries tests ---

  describe('getRecommendedQueries', () => {
    beforeEach(() => {
      availableDatasources = {
        indices: [
          { name: 'logs-2023' },
          { name: 'logs-2024' },
          { name: 'metrics' },
          { name: 'other_index' },
        ],
        data_streams: [],
        aliases: [],
      };

      // Setup some initial queries in the registry
      const registeredQueries: RecommendedQuery[] = [
        { name: 'Logs Query', query: 'FROM logs-2023 | STATS count()' },
        { name: 'Metrics Query', query: 'FROM metrics | STATS max(bytes)' },
        { name: 'Wildcard Logs Query', query: 'FROM logs-* | LIMIT 5' },
        { name: 'Other Solution Query', query: 'FROM other_index | LIMIT 1' },
      ];

      registry.setRecommendedQueries(
        [registeredQueries[0], registeredQueries[1], registeredQueries[2]],
        'oblt'
      );
      // Register a query for a different solution to test filtering
      registry.setRecommendedQueries([registeredQueries[3]], 'es');
    });

    it('should return an empty array if checkSourceExistence returns false', () => {
      const result = registry.getRecommendedQueries(
        'FROM non_existent_index',
        availableDatasources,
        'oblt'
      );
      expect(result).toEqual([]);
    });

    it('should return queries matching the exact index pattern from the query string', () => {
      const result = registry.getRecommendedQueries('FROM logs-2023', availableDatasources, 'oblt');
      expect(result).toEqual([
        { name: 'Logs Query', query: 'FROM logs-2023 | STATS count()' },
        { name: 'Wildcard Logs Query', query: 'FROM logs-* | LIMIT 5' },
      ]);
    });

    it('should return queries matching a wildcard pattern from the query string', () => {
      const result = registry.getRecommendedQueries('FROM logs-*', availableDatasources, 'oblt');
      // Expect both the concrete 'logs-2023' query and the wildcard 'logs-*' query to be returned
      expect(result).toEqual([
        { name: 'Logs Query', query: 'FROM logs-2023 | STATS count()' },
        { name: 'Wildcard Logs Query', query: 'FROM logs-* | LIMIT 5' },
      ]);
    });

    it('should return queries where the registered pattern covers the concrete index in the query string', () => {
      const result = registry.getRecommendedQueries('FROM logs-2024', availableDatasources, 'oblt');
      // Expect the 'logs-*' query to be returned because it covers 'logs-2024'
      expect(result).toEqual([{ name: 'Wildcard Logs Query', query: 'FROM logs-* | LIMIT 5' }]);
    });

    it('should filter queries by activeSolutionId', () => {
      const result = registry.getRecommendedQueries(
        'FROM other_index',
        availableDatasources,
        'oblt'
      );

      expect(result).toEqual([]); // Should be empty because it's set for 'es', not 'oblt'
    });

    it('should return an empty array if no matching indices are found by findMatchingIndicesFromPattern', () => {
      const result = registry.getRecommendedQueries(
        'FROM non_matching_index',
        availableDatasources,
        'oblt'
      );

      expect(result).toEqual([]);
    });
  });

  // --- setRecommendedFields tests ---
  describe('setRecommendedFields', () => {
    beforeEach(() => {
      availableDatasources = {
        indices: [
          { name: 'logs-web' },
          { name: 'metrics-cpu' },
          { name: 'user-activity' },
          { name: 'app-events' },
        ],
        data_streams: [],
        aliases: [],
      };
    });

    it('should add recommended fields to the registry', () => {
      const solutionId = 'security';
      const fields: RecommendedField[] = [
        { name: 'user.id', pattern: 'logs-web' },
        { name: 'http.request.method', pattern: 'logs-web' },
        { name: 'cpu.usage', pattern: 'metrics-cpu' },
      ];

      registry.setRecommendedFields(fields, solutionId);

      const retrievedFieldsForLogs = registry.getRecommendedFields(
        'FROM logs-web',
        availableDatasources,
        solutionId
      );
      expect(retrievedFieldsForLogs).toEqual([fields[0], fields[1]]);

      const retrievedFieldsForMetrics = registry.getRecommendedFields(
        'FROM metrics-cpu',
        availableDatasources,
        solutionId
      );
      expect(retrievedFieldsForMetrics).toEqual([fields[2]]);
    });

    it('should skip malformed recommended fields (missing name or pattern)', () => {
      const solutionId = 'security';
      const fields: RecommendedField[] = [
        { name: 'valid_field', pattern: 'user-activity' },
        { name: 'Missing Pattern' } as RecommendedField, // Malformed (missing pattern)
        { pattern: 'app-events' } as RecommendedField, // Malformed (missing name)
      ];

      registry.setRecommendedFields(fields, solutionId);

      const retrievedFields = registry.getRecommendedFields(
        'FROM user-activity',
        availableDatasources,
        solutionId
      );
      expect(retrievedFields).toEqual([{ name: 'valid_field', pattern: 'user-activity' }]);
    });

    it('should not add duplicate recommended fields for the same registryId and field name', () => {
      const solutionId = 'security';
      const fieldA: RecommendedField = { name: 'event.duration', pattern: 'app-events' };
      const fields: RecommendedField[] = [fieldA, { ...fieldA }]; // Duplicate entry

      registry.setRecommendedFields(fields, solutionId);
      const retrievedFields = registry.getRecommendedFields(
        'FROM app-events',
        availableDatasources,
        solutionId
      );
      expect(retrievedFields).toEqual([fieldA]);
    });

    it('should handle different solution IDs correctly for fields', () => {
      const field1: RecommendedField = { name: 'error.message', pattern: 'logs-web' };
      const field2: RecommendedField = { name: 'user.agent', pattern: 'logs-web' }; // Same pattern, different solution

      registry.setRecommendedFields([field1], 'oblt');
      registry.setRecommendedFields([field2], 'security');

      // Retrieve for oblst
      const fieldsOblt = registry.getRecommendedFields(
        'FROM logs-web',
        availableDatasources,
        'oblt'
      );
      expect(fieldsOblt).toEqual([field1]);

      // Retrieve for security
      const fieldsSecurity = registry.getRecommendedFields(
        'FROM logs-web',
        availableDatasources,
        'security'
      );
      expect(fieldsSecurity).toEqual([field2]);
    });
  });

  // --- getRecommendedFields tests ---
  describe('getRecommendedFields', () => {
    beforeEach(() => {
      availableDatasources = {
        indices: [
          { name: 'app-logs-2023' },
          { name: 'app-logs-2024' },
          { name: 'metrics-http' },
          { name: 'server-logs' },
          { name: 'user-events' },
        ],
        data_streams: [],
        aliases: [],
      };

      // Setup some initial fields in the registry
      const registeredFields: RecommendedField[] = [
        { name: 'log.level', pattern: 'app-logs-2023' },
        { name: 'http.response.status_code', pattern: 'metrics-http' },
        { name: 'app.name', pattern: 'app-logs-*' },
        { name: 'server.name', pattern: 'server-logs' },
      ];

      registry.setRecommendedFields(
        [registeredFields[0], registeredFields[1], registeredFields[2]],
        'security'
      );
      // Register a field for a different solution to test filtering
      registry.setRecommendedFields([registeredFields[3]], 'oblt');
    });

    it('should return an empty array if checkSourceExistence returns false for fields', () => {
      const result = registry.getRecommendedFields(
        'FROM non_existent_data_stream',
        availableDatasources,
        'security'
      );
      expect(result).toEqual([]);
    });

    it('should return fields matching the exact index pattern from the query string', () => {
      const result = registry.getRecommendedFields(
        'FROM app-logs-2023',
        availableDatasources,
        'security'
      );
      expect(result).toEqual([
        { name: 'log.level', pattern: 'app-logs-2023' },
        { name: 'app.name', pattern: 'app-logs-*' },
      ]);
    });

    it('should return fields matching a wildcard pattern from the query string', () => {
      const result = registry.getRecommendedFields(
        'FROM app-logs-*',
        availableDatasources,
        'security'
      );
      expect(result).toEqual([
        { name: 'log.level', pattern: 'app-logs-2023' },
        { name: 'app.name', pattern: 'app-logs-*' },
      ]);
    });

    it('should return fields where the registered pattern covers the concrete index in the query string', () => {
      const result = registry.getRecommendedFields(
        'FROM app-logs-2024',
        availableDatasources,
        'security'
      );
      expect(result).toEqual([{ name: 'app.name', pattern: 'app-logs-*' }]);
    });

    it('should filter fields by activeSolutionId', () => {
      const result = registry.getRecommendedFields(
        'FROM server-logs',
        availableDatasources,
        'security'
      );
      expect(result).toEqual([]); // Should be empty because it's set for 'oblt', not 'security'
    });

    it('should return an empty array if no matching indices are found by findMatchingIndicesFromPattern for fields', () => {
      const result = registry.getRecommendedFields(
        'FROM no_matching_field_index',
        {
          indices: [{ name: 'no_matching_field_index' }],
          data_streams: [],
          aliases: [],
        },
        'security'
      );
      expect(result).toEqual([]);
    });

    it('should return unique fields when multiple registry entries yield the same field name', () => {
      const commonField: RecommendedField = { name: 'user.ip', pattern: 'user-events' };
      // Register the same field under different solution/index pattern combinations
      registry.setRecommendedFields([{ ...commonField }], 'security');
      registry.setRecommendedFields([{ ...commonField }], 'oblt');

      const result = registry.getRecommendedFields(
        'FROM user-events',
        availableDatasources,
        'security'
      );
      expect(result).toEqual([commonField]); // Should only return one instance of the field
    });
  });
});
