/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';
import { monaco } from '@kbn/monaco';
import { getTimezoneSuggestions } from './get_timezone_suggestions';

describe('getTimezoneSuggestions', () => {
  const mockRange: monaco.IRange = {
    startLineNumber: 1,
    endLineNumber: 1,
    startColumn: 6,
    endColumn: 10,
  };

  describe('basic functionality', () => {
    it('should return suggestions when no prefix is provided', () => {
      const result = getTimezoneSuggestions(mockRange);

      expect(result).toHaveLength(25); // Limited to 25 suggestions
      expect(result[0]).toMatchObject({
        kind: monaco.languages.CompletionItemKind.EnumMember,
        range: mockRange,
      });
    });

    it('should return suggestions when empty string prefix is provided', () => {
      const result = getTimezoneSuggestions(mockRange, '');

      expect(result).toHaveLength(25);
      expect(result.every((s) => s.label && typeof s.label === 'string')).toBe(true);
    });

    it('should include all required properties in each suggestion', () => {
      const result = getTimezoneSuggestions(mockRange);

      result.forEach((suggestion) => {
        expect(suggestion).toHaveProperty('label');
        expect(suggestion).toHaveProperty('kind', monaco.languages.CompletionItemKind.EnumMember);
        expect(suggestion).toHaveProperty('insertText');
        expect(suggestion).toHaveProperty('range', mockRange);
        expect(suggestion).toHaveProperty('documentation');
        expect(suggestion).toHaveProperty('filterText');
        expect(suggestion).toHaveProperty('sortText');
        expect(suggestion).toHaveProperty('detail');
        expect(suggestion).toHaveProperty('preselect');
        expect(suggestion).toHaveProperty(
          'insertTextRules',
          monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        );
      });
    });
  });

  describe('filtering behavior', () => {
    it('should filter timezones by prefix (case-insensitive)', () => {
      const result = getTimezoneSuggestions(mockRange, 'america');

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(25);
      result.forEach((suggestion) => {
        expect((suggestion.label as string).toLowerCase()).toContain('america');
      });
    });

    it('should filter timezones with partial matches', () => {
      const result = getTimezoneSuggestions(mockRange, 'york');

      const newYorkSuggestion = result.find((s) => s.label === 'America/New_York');
      expect(newYorkSuggestion).toBeDefined();
    });

    it('should return empty array when no timezones match the prefix', () => {
      const result = getTimezoneSuggestions(mockRange, 'zzzzzzz');

      expect(result).toEqual([]);
    });

    it('should handle uppercase prefix correctly', () => {
      const result = getTimezoneSuggestions(mockRange, 'UTC');

      expect(result.length).toBeGreaterThan(0);
      result.forEach((suggestion) => {
        expect((suggestion.label as string).toUpperCase()).toContain('UTC');
      });
    });

    it('should handle mixed case prefix correctly', () => {
      const result = getTimezoneSuggestions(mockRange, 'LoNdOn');

      const londonSuggestion = result.find((s) => s.label === 'Europe/London');
      expect(londonSuggestion).toBeDefined();
    });
  });

  describe('suggestion properties', () => {
    it('should set UTC as preselected when UTC is in results', () => {
      // Need to search for UTC specifically since it's not in the first 25 alphabetically
      const result = getTimezoneSuggestions(mockRange, 'UTC');

      const utcSuggestion = result.find((s) => s.label === 'UTC');
      expect(utcSuggestion).toBeDefined();
      expect(utcSuggestion?.preselect).toBe(true);

      // Other suggestions should not be preselected
      const nonUtcSuggestions = result.filter((s) => s.label !== 'UTC');
      nonUtcSuggestions.forEach((suggestion) => {
        expect(suggestion.preselect).toBe(false);
      });
    });

    it('should prioritize UTC timezones in sortText', () => {
      // Search for UTC to ensure we get UTC timezones in results
      const result = getTimezoneSuggestions(mockRange, 'UTC');

      const utcTimezones = result.filter((s) => (s.label as string).startsWith('UTC'));
      const nonUtcTimezones = result.filter((s) => !(s.label as string).startsWith('UTC'));

      expect(utcTimezones.length).toBeGreaterThan(0);

      utcTimezones.forEach((utcSuggestion) => {
        expect(utcSuggestion.sortText).toMatch(/^!/);
      });

      if (nonUtcTimezones.length > 0) {
        nonUtcTimezones.forEach((nonUtcSuggestion) => {
          expect(nonUtcSuggestion.sortText).not.toMatch(/^!/);
          expect(nonUtcSuggestion.sortText).toBe(nonUtcSuggestion.label);
        });
      }
    });

    it('should include correct offset information in detail', () => {
      const result = getTimezoneSuggestions(mockRange, 'America/New_York');

      const newYorkSuggestion = result.find((s) => s.label === 'America/New_York');
      expect(newYorkSuggestion).toBeDefined();
      expect(newYorkSuggestion?.detail).toMatch(/^Timezone: [+-]\d{2}:\d{2}$/);
    });

    it('should include comprehensive documentation', () => {
      const result = getTimezoneSuggestions(mockRange, 'Europe/London');

      const londonSuggestion = result.find((s) => s.label === 'Europe/London');
      expect(londonSuggestion).toBeDefined();

      const doc = londonSuggestion?.documentation as { value: string };
      expect(doc.value).toContain('**Europe/London**');
      expect(doc.value).toContain('Offset:');
      expect(doc.value).toContain('Timezone identifier for RRule scheduling');
    });

    it('should set insertText equal to label', () => {
      const result = getTimezoneSuggestions(mockRange);

      result.forEach((suggestion) => {
        expect(suggestion.insertText).toBe(suggestion.label);
      });
    });

    it('should set filterText equal to label', () => {
      const result = getTimezoneSuggestions(mockRange);

      result.forEach((suggestion) => {
        expect(suggestion.filterText).toBe(suggestion.label);
      });
    });
  });

  describe('timezone data integrity', () => {
    it('should only return valid timezone names from moment.tz', () => {
      const result = getTimezoneSuggestions(mockRange);
      const validTimezones = moment.tz.names();

      result.forEach((suggestion) => {
        expect(validTimezones).toContain(suggestion.label);
      });
    });

    it('should maintain alphabetical order', () => {
      const result = getTimezoneSuggestions(mockRange);
      const labels = result.map((s) => s.label as string);

      // The order might be different due to UTC prioritization,
      // but all non-UTC should be alphabetical
      const nonUtcLabels = labels.filter((l) => !l.startsWith('UTC'));
      const sortedNonUtcLabels = [...nonUtcLabels].sort();
      expect(nonUtcLabels).toEqual(sortedNonUtcLabels);
    });
  });

  describe('edge cases and limits', () => {
    it('should limit results to 25 suggestions even when more match', () => {
      const result = getTimezoneSuggestions(mockRange, 'A'); // Many timezones start with 'A'

      expect(result).toHaveLength(25);
    });

    it('should handle special characters in prefix', () => {
      const result = getTimezoneSuggestions(mockRange, 'America/Los_Angeles');

      const laSuggestion = result.find((s) => s.label === 'America/Los_Angeles');
      expect(laSuggestion).toBeDefined();
    });

    it('should handle forward slashes in prefix', () => {
      const result = getTimezoneSuggestions(mockRange, 'America/');

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(25);
      result.forEach((suggestion) => {
        expect(suggestion.label).toMatch(/America\//);
      });
    });

    it('should handle underscores in prefix', () => {
      const result = getTimezoneSuggestions(mockRange, 'New_');

      const matchingSuggestions = result.filter((s) =>
        (s.label as string).toLowerCase().includes('new_')
      );
      expect(matchingSuggestions.length).toBeGreaterThan(0);
    });

    it('should return consistent results for the same input', () => {
      const result1 = getTimezoneSuggestions(mockRange, 'Europe');
      const result2 = getTimezoneSuggestions(mockRange, 'Europe');

      expect(result1).toHaveLength(result2.length);
      result1.forEach((suggestion, index) => {
        expect(suggestion.label).toBe(result2[index].label);
      });
    });
  });

  describe('moment timezone integration', () => {
    it('should generate valid offset format', () => {
      const result = getTimezoneSuggestions(mockRange);

      result.forEach((suggestion) => {
        const timezone = suggestion.label as string;
        const offset = moment.tz(timezone).format('Z');
        const expectedDetail = `Timezone: ${offset}`;
        expect(suggestion.detail).toBe(expectedDetail);
      });
    });

    it('should include both offset and abbreviation in documentation', () => {
      const result = getTimezoneSuggestions(mockRange, 'America/New_York');

      const newYorkSuggestion = result.find((s) => s.label === 'America/New_York');
      const doc = newYorkSuggestion?.documentation as { value: string };

      const timezone = 'America/New_York';
      const offset = moment.tz(timezone).format('Z');
      const offsetText = moment.tz(timezone).format('z');

      expect(doc.value).toContain(`Offset: ${offset} (${offsetText})`);
    });
  });
});
