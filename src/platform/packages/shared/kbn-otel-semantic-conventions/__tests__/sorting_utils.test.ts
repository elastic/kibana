/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sortObjectByKeys, createSortedEntries } from '../src/lib/sorting_utils';

describe('sorting_utils', () => {
  describe('deterministic ordering for PR diffs', () => {
    it('produces consistent field ordering across multiple executions', () => {
      // Real OpenTelemetry field names from actual usage
      const otelFields = {
        'metrics.go.memory.used': { name: 'metrics.go.memory.used', type: 'double' },
        '@timestamp': { name: '@timestamp', type: 'date_nanos' },
        'service.name': { name: 'service.name', type: 'keyword' },
        trace_id: { name: 'trace_id', type: 'keyword' },
        'resource.service.version': { name: 'resource.service.version', type: 'keyword' },
        span_id: { name: 'span_id', type: 'keyword' },
        'scope.name': { name: 'scope.name', type: 'keyword' },
        'http.request.method': { name: 'http.request.method', type: 'keyword' },
        'url.full': { name: 'url.full', type: 'keyword' },
        'error.type': { name: 'error.type', type: 'keyword' },
      };

      // Multiple executions should produce identical results
      const results = Array.from({ length: 5 }, () => Object.keys(sortObjectByKeys(otelFields)));

      // All results must be identical (critical for PR diff noise reduction)
      const baseline = results[0];
      results.forEach((result) => {
        expect(result).toEqual(baseline);
      });

      // Verify alphabetical ordering with real field names
      expect(baseline).toEqual([
        '@timestamp',
        'error.type',
        'http.request.method',
        'metrics.go.memory.used',
        'resource.service.version',
        'scope.name',
        'service.name',
        'span_id',
        'trace_id',
        'url.full',
      ]);
    });

    it('createSortedEntries produces deterministic key-value pairs for TypeScript generation', () => {
      // Field definitions used in TypeScript generation
      const fieldDefinitions = {
        'service.name': { name: 'service.name', description: 'Service name', type: 'keyword' },
        '@timestamp': { name: '@timestamp', description: 'Event timestamp', type: 'date_nanos' },
        trace_id: { name: 'trace_id', description: 'Trace identifier', type: 'keyword' },
      };

      const entries = createSortedEntries(fieldDefinitions);

      // Should be sorted alphabetically by key
      expect(entries.map(([key]) => key)).toEqual(['@timestamp', 'service.name', 'trace_id']);

      // Should preserve field metadata
      expect(entries[0][1]).toEqual({
        name: '@timestamp',
        description: 'Event timestamp',
        type: 'date_nanos',
      });
    });
  });

  describe('edge cases', () => {
    it('handles empty objects without errors', () => {
      expect(sortObjectByKeys({})).toEqual({});
      expect(createSortedEntries({})).toEqual([]);
    });
  });
});
