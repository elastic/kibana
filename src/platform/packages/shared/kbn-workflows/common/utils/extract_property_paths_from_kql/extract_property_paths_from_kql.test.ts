/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractPropertyPathsFromKql } from './extract_property_paths_from_kql';

describe('extractPropertyPathsFromKql', () => {
  describe('basic field extraction', () => {
    it('should extract single field from simple KQL query', () => {
      expect(extractPropertyPathsFromKql('foo:bar')).toEqual(['foo']);
    });

    it('should extract multiple fields from KQL query with AND operator', () => {
      const result = extractPropertyPathsFromKql('foo.bar:this and steps.analysis:foo');
      expect(result).toEqual(expect.arrayContaining(['foo.bar', 'steps.analysis']));
      expect(result).toHaveLength(2);
    });

    it('should extract fields with different operators', () => {
      const result = extractPropertyPathsFromKql('name:"John Doe" and age:30 or status:active');
      expect(result).toEqual(expect.arrayContaining(['name', 'age', 'status']));
      expect(result).toHaveLength(3);
    });

    it('should handle nested property paths with dots', () => {
      const result = extractPropertyPathsFromKql(
        'user.profile.name:john and user.settings.theme:dark'
      );
      expect(result).toEqual(expect.arrayContaining(['user.profile.name', 'user.settings.theme']));
      expect(result).toHaveLength(2);
    });
  });

  describe('quoted values', () => {
    it('should handle double-quoted values', () => {
      const result = extractPropertyPathsFromKql('title:"The Great Gatsby" and author:fitzgerald');
      expect(result).toEqual(expect.arrayContaining(['title', 'author']));
      expect(result).toHaveLength(2);
    });

    it('should handle single-quoted values', () => {
      const result = extractPropertyPathsFromKql("title:'The Great Gatsby' and author:fitzgerald");
      expect(result).toEqual(expect.arrayContaining(['title', 'author']));
      expect(result).toHaveLength(2);
    });

    it('should ignore field names within quoted strings', () => {
      const result = extractPropertyPathsFromKql(
        'description:"This contains field:value text" and status:active'
      );
      expect(result).toEqual(expect.arrayContaining(['description', 'status']));
      expect(result).toHaveLength(2);
    });

    it('should handle escaped quotes in values', () => {
      const result = extractPropertyPathsFromKql('message:"He said \\"Hello\\"" and sender:john');
      expect(result).toEqual(expect.arrayContaining(['message', 'sender']));
      expect(result).toHaveLength(2);
    });
  });

  describe('logical operators', () => {
    it('should handle OR operator', () => {
      expect(extractPropertyPathsFromKql('status:active or status:inactive')).toEqual(['status']);
    });

    it('should handle NOT operator', () => {
      const result = extractPropertyPathsFromKql('not status:deleted and name:john');
      expect(result).toEqual(expect.arrayContaining(['status', 'name']));
      expect(result).toHaveLength(2);
    });

    it('should handle complex logical expressions', () => {
      const result = extractPropertyPathsFromKql('(name:john or name:jane) and status:active');
      expect(result).toEqual(expect.arrayContaining(['name', 'status']));
      expect(result).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for empty string', () => {
      expect(extractPropertyPathsFromKql('')).toEqual([]);
    });

    it('should return empty array for null input', () => {
      expect(extractPropertyPathsFromKql(null as any)).toEqual([]);
    });

    it('should return empty array for non-string input', () => {
      expect(extractPropertyPathsFromKql(123 as any)).toEqual([]);
    });

    it('should handle query with no field:value patterns', () => {
      expect(extractPropertyPathsFromKql('just some text without colons')).toEqual([]);
    });

    it('should handle fields with underscores and numbers', () => {
      const result = extractPropertyPathsFromKql('field_name_1:value and field2:another');
      expect(result).toEqual(expect.arrayContaining(['field_name_1', 'field2']));
      expect(result).toHaveLength(2);
    });

    it('should return unique field names', () => {
      expect(
        extractPropertyPathsFromKql('status:active and status:inactive and status:pending')
      ).toEqual(['status']);
    });
  });

  describe('whitespace and formatting', () => {
    it('should handle extra whitespace', () => {
      const result = extractPropertyPathsFromKql('  field1  :  value1   and   field2  :  value2  ');
      expect(result).toEqual(expect.arrayContaining(['field1', 'field2']));
      expect(result).toHaveLength(2);
    });

    it('should handle fields at the beginning of the query', () => {
      expect(extractPropertyPathsFromKql('status:active')).toEqual(['status']);
    });

    it('should handle fields after parentheses', () => {
      const result = extractPropertyPathsFromKql('(name:john) and status:active');
      expect(result).toEqual(expect.arrayContaining(['name', 'status']));
      expect(result).toHaveLength(2);
    });
  });

  describe('template expressions', () => {
    it('should extract both field names and template variables from KQL with template values', () => {
      const result = extractPropertyPathsFromKql('foreach.item: {{ consts.favorite_person }}');
      expect(result).toEqual(expect.arrayContaining(['foreach.item', 'consts.favorite_person']));
      expect(result).toHaveLength(2);
    });

    it('should handle multiple template expressions in a single query', () => {
      const result = extractPropertyPathsFromKql(
        'field1: {{ inputs.value1 }} and field2: {{ steps.output }}'
      );
      expect(result).toEqual(
        expect.arrayContaining(['field1', 'field2', 'inputs.value1', 'steps.output'])
      );
      expect(result).toHaveLength(4);
    });

    it('should handle template expressions in complex KQL queries', () => {
      const result = extractPropertyPathsFromKql(
        '(status: {{ consts.status }} or priority: {{ inputs.priority }}) and name:john'
      );
      expect(result).toEqual(
        expect.arrayContaining(['status', 'priority', 'name', 'consts.status', 'inputs.priority'])
      );
      expect(result).toHaveLength(5);
    });

    it('should handle template expressions with nested property paths', () => {
      const result = extractPropertyPathsFromKql(
        'event.rule.name: {{ steps.analysis.output.ruleName }}'
      );
      expect(result).toEqual(
        expect.arrayContaining(['event.rule.name', 'steps.analysis.output.ruleName'])
      );
      expect(result).toHaveLength(2);
    });

    it('should handle queries with only template expressions (no static values)', () => {
      const result = extractPropertyPathsFromKql('field: {{ inputs.value }}');
      expect(result).toEqual(expect.arrayContaining(['field', 'inputs.value']));
      expect(result).toHaveLength(2);
    });

    it('should handle mixed static and template values in the same query', () => {
      const result = extractPropertyPathsFromKql(
        'static.field:staticValue and dynamic.field: {{ consts.dynamicValue }}'
      );
      expect(result).toEqual(
        expect.arrayContaining(['static.field', 'dynamic.field', 'consts.dynamicValue'])
      );
      expect(result).toHaveLength(3);
    });

    it('should not fail on malformed template expressions', () => {
      // Should still extract what it can
      const result = extractPropertyPathsFromKql('field:value and broken.field: {{ incomplete');
      expect(result).toEqual(expect.arrayContaining(['field']));
    });

    it('should handle template expressions with spaces and special characters', () => {
      const result = extractPropertyPathsFromKql('field: {{ consts.my_value }} and other:test');
      expect(result).toEqual(expect.arrayContaining(['field', 'other', 'consts.my_value']));
      expect(result).toHaveLength(3);
    });

    it('should handle very long strings without catastrophic backtracking (ReDoS prevention)', () => {
      // This test ensures the regex doesn't cause exponential backtracking
      // Previous vulnerable pattern: /\{\{[^}]*\}\}/g could cause ReDoS
      // Fixed pattern: /\{\{[^{}]*\}\}/g prevents backtracking
      const longString = 'a'.repeat(10000);
      const kql = `field:{{ ${longString} }} and other:value`;

      // This should complete quickly (not hang)
      const start = Date.now();
      const result = extractPropertyPathsFromKql(kql);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
      expect(result).toEqual(expect.arrayContaining(['field', 'other']));
    });

    it('should handle pathological ReDoS input without hanging', () => {
      // This is a known ReDoS pattern that would cause catastrophic backtracking
      // with the vulnerable regex /\{\{[^}]*\}\}/g
      const pathologicalInput = `field:{{ ${'a'.repeat(50)} and other:value`;

      // This should complete quickly (not hang)
      const start = Date.now();
      const result = extractPropertyPathsFromKql(pathologicalInput);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
      expect(result).toEqual(expect.arrayContaining(['field']));
    });
  });
});
