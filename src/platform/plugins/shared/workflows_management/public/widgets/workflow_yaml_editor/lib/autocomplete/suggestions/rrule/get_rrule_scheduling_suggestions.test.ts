/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { getRRuleSchedulingSuggestions } from './get_rrule_scheduling_suggestions';

// Mock the dependencies
jest.mock('../../../snippets/generate_trigger_snippet', () => ({
  generateRRuleTriggerSnippet: jest.fn(),
}));

import { generateRRuleTriggerSnippet } from '../../../snippets/generate_trigger_snippet';

describe('getRRuleSchedulingSuggestions', () => {
  const mockRange: monaco.IRange = {
    startLineNumber: 1,
    endLineNumber: 1,
    startColumn: 6,
    endColumn: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the generateRRuleTriggerSnippet to return predictable snippets
    (generateRRuleTriggerSnippet as jest.Mock).mockImplementation((pattern) => {
      return `rrule-snippet-${pattern}`;
    });
  });

  describe('basic functionality', () => {
    it('should return exactly 4 RRule pattern suggestions', () => {
      const result = getRRuleSchedulingSuggestions(mockRange);
      expect(result).toHaveLength(4);
    });

    it('should include all expected RRule patterns', () => {
      const result = getRRuleSchedulingSuggestions(mockRange);
      const labels = result.map((s) => s.label);

      expect(labels).toEqual([
        'Daily at 9 AM',
        'Business hours (weekdays 8 AM & 5 PM)',
        'Monthly on 1st and 15th',
        'Custom RRule',
      ]);
    });

    it('should call generateRRuleTriggerSnippet with correct parameters', () => {
      getRRuleSchedulingSuggestions(mockRange);

      expect(generateRRuleTriggerSnippet).toHaveBeenCalledTimes(4);
      expect(generateRRuleTriggerSnippet).toHaveBeenCalledWith('daily', {
        monacoSuggestionFormat: true,
      });
      expect(generateRRuleTriggerSnippet).toHaveBeenCalledWith('weekly', {
        monacoSuggestionFormat: true,
      });
      expect(generateRRuleTriggerSnippet).toHaveBeenCalledWith('monthly', {
        monacoSuggestionFormat: true,
      });
      expect(generateRRuleTriggerSnippet).toHaveBeenCalledWith('custom', {
        monacoSuggestionFormat: true,
      });
    });
  });

  describe('suggestion properties', () => {
    it('should set correct properties for daily pattern', () => {
      const result = getRRuleSchedulingSuggestions(mockRange);
      const dailySuggestion = result.find((s) => s.label === 'Daily at 9 AM');

      expect(dailySuggestion).toMatchObject({
        label: 'Daily at 9 AM',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'rrule-snippet-daily',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Run daily at 9:00 AM UTC',
        filterText: 'Daily at 9 AM',
        sortText: '!rrule-daily',
        detail: 'RRule scheduling pattern',
        preselect: false,
      });
    });

    it('should set correct properties for weekly pattern', () => {
      const result = getRRuleSchedulingSuggestions(mockRange);
      const weeklySuggestion = result.find(
        (s) => s.label === 'Business hours (weekdays 8 AM & 5 PM)'
      );

      expect(weeklySuggestion).toMatchObject({
        label: 'Business hours (weekdays 8 AM & 5 PM)',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'rrule-snippet-weekly',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Run on weekdays at 8 AM and 5 PM EST',
        filterText: 'Business hours (weekdays 8 AM & 5 PM)',
        sortText: '!rrule-weekly',
        detail: 'RRule scheduling pattern',
        preselect: false,
      });
    });

    it('should set correct properties for monthly pattern', () => {
      const result = getRRuleSchedulingSuggestions(mockRange);
      const monthlySuggestion = result.find((s) => s.label === 'Monthly on 1st and 15th');

      expect(monthlySuggestion).toMatchObject({
        label: 'Monthly on 1st and 15th',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'rrule-snippet-monthly',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Run monthly on 1st and 15th at 10:30 AM UTC',
        filterText: 'Monthly on 1st and 15th',
        sortText: '!rrule-monthly',
        detail: 'RRule scheduling pattern',
        preselect: false,
      });
    });

    it('should set correct properties for custom pattern', () => {
      const result = getRRuleSchedulingSuggestions(mockRange);
      const customSuggestion = result.find((s) => s.label === 'Custom RRule');

      expect(customSuggestion).toMatchObject({
        label: 'Custom RRule',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'rrule-snippet-custom',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Create a custom RRule configuration with all options',
        filterText: 'Custom RRule',
        sortText: '!rrule-custom',
        detail: 'RRule scheduling pattern',
        preselect: false,
      });
    });

    it('should all have Snippet as CompletionItemKind', () => {
      const result = getRRuleSchedulingSuggestions(mockRange);
      result.forEach((suggestion) => {
        expect(suggestion.kind).toBe(monaco.languages.CompletionItemKind.Snippet);
      });
    });

    it('should all have InsertAsSnippet as insertTextRules', () => {
      const result = getRRuleSchedulingSuggestions(mockRange);
      result.forEach((suggestion) => {
        expect(suggestion.insertTextRules).toBe(
          monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        );
      });
    });

    it('should all have "RRule scheduling pattern" as detail', () => {
      const result = getRRuleSchedulingSuggestions(mockRange);
      result.forEach((suggestion) => {
        expect(suggestion.detail).toBe('RRule scheduling pattern');
      });
    });

    it('should all have preselect set to false', () => {
      const result = getRRuleSchedulingSuggestions(mockRange);
      result.forEach((suggestion) => {
        expect(suggestion.preselect).toBe(false);
      });
    });
  });

  describe('range handling', () => {
    it('should extend the range for multi-line insertions', () => {
      const result = getRRuleSchedulingSuggestions(mockRange);

      result.forEach((suggestion) => {
        expect(suggestion.range).toEqual({
          startLineNumber: 1,
          endLineNumber: 1,
          startColumn: 6,
          endColumn: 1000, // Extended to 1000
        });
      });
    });

    it('should preserve start position from input range', () => {
      const customRange: monaco.IRange = {
        startLineNumber: 5,
        endLineNumber: 5,
        startColumn: 10,
        endColumn: 15,
      };

      const result = getRRuleSchedulingSuggestions(customRange);

      result.forEach((suggestion) => {
        expect(suggestion.range).toMatchObject({
          startLineNumber: 5,
          startColumn: 10,
        });
      });
    });

    it('should always extend endColumn to at least 1000', () => {
      const largeEndColumnRange: monaco.IRange = {
        startLineNumber: 1,
        endLineNumber: 1,
        startColumn: 1,
        endColumn: 2000,
      };

      const result = getRRuleSchedulingSuggestions(largeEndColumnRange);

      result.forEach((suggestion) => {
        expect((suggestion.range as monaco.IRange).endColumn).toBe(2000);
      });
    });
  });

  describe('sort order', () => {
    it('should maintain consistent order of suggestions', () => {
      const result1 = getRRuleSchedulingSuggestions(mockRange);
      const result2 = getRRuleSchedulingSuggestions(mockRange);

      expect(result1.map((s) => s.label)).toEqual(result2.map((s) => s.label));
    });

    it('should use priority prefix in sortText', () => {
      const result = getRRuleSchedulingSuggestions(mockRange);

      expect(result[0].sortText).toBe('!rrule-daily');
      expect(result[1].sortText).toBe('!rrule-weekly');
      expect(result[2].sortText).toBe('!rrule-monthly');
      expect(result[3].sortText).toBe('!rrule-custom');
    });
  });

  describe('snippet generation', () => {
    it('should use snippet text from generateRRuleTriggerSnippet', () => {
      (generateRRuleTriggerSnippet as jest.Mock).mockImplementation((pattern) => {
        return `custom-snippet-for-${pattern}`;
      });

      const result = getRRuleSchedulingSuggestions(mockRange);

      expect(result[0].insertText).toBe('custom-snippet-for-daily');
      expect(result[1].insertText).toBe('custom-snippet-for-weekly');
      expect(result[2].insertText).toBe('custom-snippet-for-monthly');
      expect(result[3].insertText).toBe('custom-snippet-for-custom');
    });

    it('should handle multi-line snippets', () => {
      (generateRRuleTriggerSnippet as jest.Mock).mockImplementation((pattern) => {
        return `rrule:\n  freq: ${pattern.toUpperCase()}\n  interval: 1`;
      });

      const result = getRRuleSchedulingSuggestions(mockRange);

      expect(result[0].insertText).toContain('rrule:\n  freq: DAILY');
      expect(result[1].insertText).toContain('rrule:\n  freq: WEEKLY');
    });
  });

  describe('edge cases', () => {
    it('should handle empty range', () => {
      const emptyRange: monaco.IRange = {
        startLineNumber: 1,
        endLineNumber: 1,
        startColumn: 1,
        endColumn: 1,
      };

      const result = getRRuleSchedulingSuggestions(emptyRange);

      expect(result).toHaveLength(4);
      result.forEach((suggestion) => {
        expect((suggestion.range as monaco.IRange).endColumn).toBe(1000);
      });
    });

    it('should handle generateRRuleTriggerSnippet returning empty string', () => {
      (generateRRuleTriggerSnippet as jest.Mock).mockReturnValue('');

      const result = getRRuleSchedulingSuggestions(mockRange);

      result.forEach((suggestion) => {
        expect(suggestion.insertText).toBe('');
      });
    });

    it('should handle generateRRuleTriggerSnippet throwing error', () => {
      (generateRRuleTriggerSnippet as jest.Mock).mockImplementation(() => {
        throw new Error('Snippet generation failed');
      });

      expect(() => getRRuleSchedulingSuggestions(mockRange)).toThrow('Snippet generation failed');
    });
  });

  describe('filtering and matching', () => {
    it('should set filterText to match label for proper filtering', () => {
      const result = getRRuleSchedulingSuggestions(mockRange);

      result.forEach((suggestion) => {
        expect(suggestion.filterText).toBe(suggestion.label);
      });
    });

    it('should not duplicate suggestions', () => {
      const result = getRRuleSchedulingSuggestions(mockRange);
      const labels = result.map((s) => s.label);
      const uniqueLabels = [...new Set(labels)];

      expect(labels).toEqual(uniqueLabels);
    });
  });
});
