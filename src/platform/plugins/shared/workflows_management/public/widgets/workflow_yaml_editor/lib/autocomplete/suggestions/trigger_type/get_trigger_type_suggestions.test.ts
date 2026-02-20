/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import {
  getBuiltInTriggerTypesFromSchema,
  getTriggerTypeSuggestions,
} from './get_trigger_type_suggestions';

jest.mock('../../../../../../trigger_schemas', () => ({
  triggerSchemas: { getTriggerDefinitions: () => [] },
}));

// Mock the generate_trigger_snippet module
jest.mock('../../../snippets/generate_trigger_snippet', () => ({
  generateTriggerSnippet: jest.fn(),
}));

import { generateTriggerSnippet } from '../../../snippets/generate_trigger_snippet';

describe('get_trigger_type_suggestions', () => {
  const mockRange: monaco.IRange = {
    startLineNumber: 1,
    endLineNumber: 1,
    startColumn: 6,
    endColumn: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the generateTriggerSnippet to return predictable snippets
    (generateTriggerSnippet as jest.Mock).mockImplementation((type) => {
      switch (type) {
        case 'alert':
          return `alert:
  # Alert trigger configuration`;
        case 'scheduled':
          return `scheduled:
  with:
    every: \${1|5m,2h,1d,30s|}`;
        case 'manual':
          return `manual:
  # Manual trigger configuration`;
        default:
          return `${type}:
  # Trigger configuration`;
      }
    });
  });

  describe('getTriggerTypeSuggestions', () => {
    describe('basic functionality', () => {
      it('should return all trigger types when no prefix is provided', () => {
        const result = getTriggerTypeSuggestions('', mockRange);
        expect(result).toHaveLength(3); // alert, scheduled, manual
        expect(result.map((s) => s.label)).toEqual(
          expect.arrayContaining(['alert', 'scheduled', 'manual'])
        );
      });

      it('should filter trigger types by prefix (case-insensitive)', () => {
        const result = getTriggerTypeSuggestions('ale', mockRange);
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('alert');
      });

      it('should filter trigger types by prefix - scheduled', () => {
        const suggestions = getTriggerTypeSuggestions('sch', mockRange);
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].label).toBe('scheduled');
      });

      it('should filter trigger types by prefix - manual', () => {
        const result = getTriggerTypeSuggestions('man', mockRange);
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('manual');
      });

      it('should handle case-insensitive matching', () => {
        const result = getTriggerTypeSuggestions('ALERT', mockRange);
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('alert');
      });

      it('should match partial strings in the middle of the type', () => {
        const result = getTriggerTypeSuggestions('ert', mockRange);
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('alert');
      });

      it('should return empty array when no matches found', () => {
        const result = getTriggerTypeSuggestions('xyz', mockRange);
        expect(result).toHaveLength(0);
      });
    });

    describe('snippet generation', () => {
      it('should generate snippets for each trigger type', () => {
        getTriggerTypeSuggestions('', mockRange);

        // Check that generateTriggerSnippet was called for each trigger type
        expect(generateTriggerSnippet).toHaveBeenCalledTimes(3);
        expect(generateTriggerSnippet).toHaveBeenCalledWith('alert');
        expect(generateTriggerSnippet).toHaveBeenCalledWith('scheduled');
        expect(generateTriggerSnippet).toHaveBeenCalledWith('manual');
      });

      it('should include generated snippets as insertText', () => {
        const result = getTriggerTypeSuggestions('', mockRange);

        const alertSuggestion = result.find((s) => s.label === 'alert');
        expect(alertSuggestion?.insertText).toContain('alert:');
        expect(alertSuggestion?.insertText).toContain('# Alert trigger configuration');

        const scheduledSuggestion = result.find((s) => s.label === 'scheduled');
        expect(scheduledSuggestion?.insertText).toContain('scheduled:');
        expect(scheduledSuggestion?.insertText).toContain('every:');

        const manualSuggestion = result.find((s) => s.label === 'manual');
        expect(manualSuggestion?.insertText).toContain('manual:');
      });

      it('should set insertTextRules to InsertAsSnippet', () => {
        const result = getTriggerTypeSuggestions('', mockRange);
        result.forEach((suggestion) => {
          expect(suggestion.insertTextRules).toBe(
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
          );
        });
      });
    });

    describe('completion item properties', () => {
      it('should set correct completion kinds for different trigger types', () => {
        const result = getTriggerTypeSuggestions('', mockRange);

        const alertSuggestion = result.find((s) => s.label === 'alert');
        expect(alertSuggestion?.kind).toBe(monaco.languages.CompletionItemKind.Customcolor);

        const scheduledSuggestion = result.find((s) => s.label === 'scheduled');
        expect(scheduledSuggestion?.kind).toBe(monaco.languages.CompletionItemKind.Operator);

        const manualSuggestion = result.find((s) => s.label === 'manual');
        expect(manualSuggestion?.kind).toBe(monaco.languages.CompletionItemKind.TypeParameter);
      });

      it('should set correct documentation for each trigger type', () => {
        const result = getTriggerTypeSuggestions('', mockRange);

        const alertSuggestion = result.find((s) => s.label === 'alert');
        expect(alertSuggestion?.documentation).toBe('Trigger workflow when an alert rule fires');

        const scheduledSuggestion = result.find((s) => s.label === 'scheduled');
        expect(scheduledSuggestion?.documentation).toBe(
          'Trigger workflow on a schedule (cron or interval)'
        );

        const manualSuggestion = result.find((s) => s.label === 'manual');
        expect(manualSuggestion?.documentation).toBe('Trigger workflow manually');
      });

      it('should set detail to "Workflow trigger" for all suggestions', () => {
        const result = getTriggerTypeSuggestions('', mockRange);
        result.forEach((suggestion) => {
          expect(suggestion.detail).toBe('Workflow trigger');
        });
      });

      it('should set sortText with priority prefix', () => {
        const result = getTriggerTypeSuggestions('', mockRange);
        result.forEach((suggestion) => {
          expect(suggestion.sortText).toBe(`!${suggestion.label}`);
        });
      });

      it('should set filterText to match the trigger type', () => {
        const result = getTriggerTypeSuggestions('', mockRange);
        result.forEach((suggestion) => {
          expect(suggestion.filterText).toBe(suggestion.label);
        });
      });

      it('should not set preselect', () => {
        const result = getTriggerTypeSuggestions('', mockRange);
        result.forEach((suggestion) => {
          expect(suggestion.preselect).toBe(false);
        });
      });

      it('should use extended range for multi-line insertions', () => {
        const result = getTriggerTypeSuggestions('', mockRange);
        result.forEach((suggestion) => {
          expect(suggestion.range).toEqual({
            startLineNumber: 1,
            endLineNumber: 1,
            startColumn: 6,
            endColumn: 1000,
          });
        });
      });
    });

    describe('edge cases', () => {
      it('should handle empty string prefix', () => {
        const result = getTriggerTypeSuggestions('', mockRange);
        expect(result).toHaveLength(3);
      });

      it('should handle whitespace prefix', () => {
        const result = getTriggerTypeSuggestions('  ', mockRange);
        expect(result).toHaveLength(3); // whitespace doesn't match any trigger types
      });

      it('should handle special characters in prefix', () => {
        const result = getTriggerTypeSuggestions('@#$', mockRange);
        expect(result).toHaveLength(0);
      });

      it('should handle very long prefix', () => {
        const longPrefix = 'a'.repeat(100);
        const result = getTriggerTypeSuggestions(longPrefix, mockRange);
        expect(result).toHaveLength(0);
      });

      it('should handle range with same start and end', () => {
        const sameRange: monaco.IRange = {
          startLineNumber: 1,
          endLineNumber: 1,
          startColumn: 10,
          endColumn: 10,
        };
        const result = getTriggerTypeSuggestions('', sameRange);
        expect(result).toHaveLength(3);
        result.forEach((suggestion) => {
          expect((suggestion.range as monaco.IRange).endColumn).toBe(1000);
        });
      });
    });
  });

  describe('getBuiltInTriggerTypesFromSchema', () => {
    it('should return array of trigger types extracted from schema', () => {
      const result = getBuiltInTriggerTypesFromSchema();
      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([
          {
            type: 'alert',
            description: 'Trigger workflow when an alert rule fires',
            icon: monaco.languages.CompletionItemKind.Customcolor,
          },
          {
            type: 'scheduled',
            description: 'Trigger workflow on a schedule (cron or interval)',
            icon: monaco.languages.CompletionItemKind.Operator,
          },
          {
            type: 'manual',
            description: 'Trigger workflow manually',
            icon: monaco.languages.CompletionItemKind.TypeParameter,
          },
        ])
      );
    });

    it('should cache the result and return same instance on subsequent calls', () => {
      const result1 = getBuiltInTriggerTypesFromSchema();
      const result2 = getBuiltInTriggerTypesFromSchema();
      expect(result1).toBe(result2); // Same reference
    });

    it('should return trigger types with correct properties', () => {
      const result = getBuiltInTriggerTypesFromSchema();
      result.forEach((triggerType) => {
        expect(triggerType).toHaveProperty('type');
        expect(triggerType).toHaveProperty('description');
        expect(triggerType).toHaveProperty('icon');
        expect(typeof triggerType.type).toBe('string');
        expect(typeof triggerType.description).toBe('string');
        expect(typeof triggerType.icon).toBe('number'); // monaco.languages.CompletionItemKind values are numbers
      });
    });
  });
});
