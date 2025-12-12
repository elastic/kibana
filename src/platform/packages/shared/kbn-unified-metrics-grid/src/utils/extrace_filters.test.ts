/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractFilters } from './extract_filters';

describe('extractFilters', () => {
  describe('basic WHERE clause scenarios', () => {
    it('should extract filters from uppercase WHERE clause', () => {
      const query = 'FROM traces* | WHERE service.name == "foo"';
      const result = extractFilters(query);
      expect(result).toEqual(['service.name == "foo"']);
    });

    it('should extract filters from lowercase where clause', () => {
      const query = 'FROM traces* | where service.name == "foo"';
      const result = extractFilters(query);
      expect(result).toEqual(['service.name == "foo"']);
    });

    it('should extract filters from mixed case Where clause', () => {
      const query = 'FROM traces* | Where service.name == "foo"';
      const result = extractFilters(query);
      expect(result).toEqual(['service.name == "foo"']);
    });
  });

  describe('multiple WHERE clauses', () => {
    it('should extract WHERE filters from multiple pipe segments', () => {
      const query = 'FROM traces* | WHERE service.name == "foo" | WHERE status == "error"';
      const result = extractFilters(query);
      expect(result).toEqual(['service.name == "foo"', 'status == "error"']);
    });

    it('should handle mixed case WHERE clauses in multiple segments', () => {
      const query =
        'FROM traces* | WHERE service.name == "foo" | where status == "error" | Where duration > 1000';
      const result = extractFilters(query);
      expect(result).toEqual(['service.name == "foo"', 'status == "error"', 'duration > 1000']);
    });
  });

  describe('complex WHERE conditions with operators', () => {
    it('should extract WHERE with AND operator', () => {
      const query = 'FROM traces* | WHERE service.name == "foo" AND status == "error"';
      const result = extractFilters(query);
      expect(result).toEqual(['service.name == "foo" AND status == "error"']);
    });

    it('should extract WHERE with OR operator', () => {
      const query = 'FROM traces* | WHERE service.name == "foo" OR service.name == "bar"';
      const result = extractFilters(query);
      expect(result).toEqual(['service.name == "foo" OR service.name == "bar"']);
    });

    it('should extract WHERE with IN operator', () => {
      const query = 'FROM traces* | WHERE service.name IN ("foo", "bar", "baz")';
      const result = extractFilters(query);
      expect(result).toEqual(['service.name IN ("foo", "bar", "baz")']);
    });

    it('should extract WHERE with complex AND/OR combinations', () => {
      const query =
        'FROM traces* | WHERE service.name == "foo" OR service.name == "bar" AND status == "error"';
      const result = extractFilters(query);
      expect(result).toEqual([
        'service.name == "foo" OR service.name == "bar" AND status == "error"',
      ]);
    });
  });

  describe('multiple WHERE clauses with complex operators', () => {
    it('should extract multiple WHERE clauses with different operators', () => {
      const query =
        'FROM traces* | WHERE service.name IN ("foo", "bar") | WHERE status == "error" AND duration > 1000';
      const result = extractFilters(query);
      expect(result).toEqual([
        'service.name IN ("foo", "bar")',
        'status == "error" AND duration > 1000',
      ]);
    });

    it('should handle WHERE with nested conditions and multiple segments', () => {
      const query =
        'FROM traces* | WHERE service.name == "foo" | where status == "error" OR status == "warning" AND duration > 500 | WHERE environment IN ("prod", "staging")';
      const result = extractFilters(query);
      expect(result).toEqual([
        'service.name == "foo"',
        'status == "error" OR status == "warning" AND duration > 500',
        'environment IN ("prod", "staging")',
      ]);
    });
  });

  describe('ES|tQL commands with various data ypes', () => {
    it('should extract WHERE with string comparison', () => {
      const query = 'FROM logs* | WHERE message LIKE "*error*"';
      const result = extractFilters(query);
      expect(result).toEqual(['message LIKE "*error*"']);
    });

    it('should extract WHERE with numeric comparison', () => {
      const query = 'FROM metrics* | WHERE cpu_usage > 80.5 AND memory_usage < 1024';
      const result = extractFilters(query);
      expect(result).toEqual(['cpu_usage > 80.5 AND memory_usage < 1024']);
    });

    it('should extract WHERE with timestamp comparison', () => {
      const query = 'FROM traces* | WHERE @timestamp >= "2023-01-01" AND @timestamp < "2023-02-01"';
      const result = extractFilters(query);
      expect(result).toEqual(['@timestamp >= "2023-01-01" AND @timestamp < "2023-02-01"']);
    });

    it('should extract WHERE with null checks', () => {
      const query = 'FROM traces* | WHERE service.version IS NOT NULL AND error.message IS NULL';
      const result = extractFilters(query);
      expect(result).toEqual(['service.version IS NOT NULL AND error.message IS NULL']);
    });
  });

  describe('edge cases and special scenarios', () => {
    it('should return empty array when no WHERE clause is present', () => {
      const query = 'FROM traces* | STATS count() BY service.name';
      const result = extractFilters(query);
      expect(result).toEqual([]);
    });

    it('should handle empty query', () => {
      const query = '';
      const result = extractFilters(query);
      expect(result).toEqual([]);
    });

    it('should handle query with only whitespace', () => {
      const query = '   ';
      const result = extractFilters(query);
      expect(result).toEqual([]);
    });

    it('should ignore WHERE as part of field names or values', () => {
      const query = 'FROM traces* | WHERE field_name_with_where == "value_with_where_keyword"';
      const result = extractFilters(query);
      expect(result).toEqual(['field_name_with_where == "value_with_where_keyword"']);
    });

    it('should handle WHERE with extra whitespace', () => {
      const query = 'FROM traces*   |   WHERE   service.name == "foo"   ';
      const result = extractFilters(query);
      expect(result).toEqual(['service.name == "foo"']);
    });

    it('should handle multiple pipes without WHERE', () => {
      const query = 'FROM traces* | STATS count() BY service.name | SORT count() DESC';
      const result = extractFilters(query);
      expect(result).toEqual([]);
    });
  });
});
