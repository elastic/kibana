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
});
