/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getHardcodedMappings } from '../src/lib/hardcoded_mappings';

describe('hardcoded_mappings', () => {
  describe('getHardcodedMappings', () => {
    it('should return valid field mappings with proper structure', () => {
      const mappings = getHardcodedMappings();

      expect(Object.keys(mappings).length).toBeGreaterThan(30); // Expect substantial field coverage

      // Validate structure for a sample of fields
      const sampleFields = ['@timestamp', 'trace_id', 'scope.name'];
      sampleFields.forEach((fieldName) => {
        expect(mappings[fieldName]).toMatchObject({
          name: fieldName,
          description: expect.any(String),
          type: expect.any(String),
        });
        expect(mappings[fieldName].description.length).toBeGreaterThan(10);
      });
    });

    it('should include expected core OTLP fields', () => {
      const mappings = getHardcodedMappings();

      // Test critical fields that should always exist
      const criticalFields = ['@timestamp', 'trace_id', 'span_id', 'scope.name'];

      criticalFields.forEach((field) => {
        expect(mappings[field]).toBeDefined();
      });
    });
  });

  describe('field validation', () => {
    it('should use only valid Elasticsearch field types', () => {
      const mappings = getHardcodedMappings();
      const validTypes = [
        'keyword',
        'text',
        'match_only_text',
        'long',
        'double',
        'date_nanos',
        'boolean',
        'object',
        'flattened',
        'constant_keyword',
        'passthrough',
        'exponential_histogram',
        'aggregate_metric_double',
      ];

      const usedTypes = [...new Set(Object.values(mappings).map((field) => field.type))];
      usedTypes.forEach((type) => {
        expect(validTypes).toContain(type);
      });
    });

    it('should have unique field names and consistent properties', () => {
      const mappings = getHardcodedMappings();
      const fieldNames = Object.keys(mappings);

      // No duplicate field names
      expect(new Set(fieldNames).size).toBe(fieldNames.length);

      // Name property matches key
      Object.entries(mappings).forEach(([key, field]) => {
        expect(field.name).toBe(key);
      });
    });
  });
});
