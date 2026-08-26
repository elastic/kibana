/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import { z } from '@kbn/zod/v4';
import {
  getBuiltInTriggerTypesFromSchema,
  getTriggerTypeSuggestions,
} from './get_trigger_type_suggestions';

const mockEventSchema = z.object({});

function mockTrigger(
  definition: Omit<PublicTriggerDefinition, 'eventSchema'>
): PublicTriggerDefinition {
  return { ...definition, eventSchema: mockEventSchema };
}

const mockGetTriggerDefinitions = jest.fn((): PublicTriggerDefinition[] => []);
const mockGetTriggerDefinition = jest.fn(
  (_id: string): PublicTriggerDefinition | undefined => undefined
);

jest.mock('../../../../../../trigger_schemas', () => ({
  triggerSchemas: {
    getTriggerDefinitions: () => mockGetTriggerDefinitions(),
    getTriggerDefinition: (id: string) => mockGetTriggerDefinition(id),
  },
}));

jest.mock('../../../snippets/generate_trigger_snippet', () => ({
  generateTriggerSnippet: jest.fn(),
}));

import { generateTriggerSnippet } from '../../../snippets/generate_trigger_snippet';

function getSuggestionLabel(label: monaco.languages.CompletionItem['label']): string {
  return typeof label === 'string' ? label : label.label;
}

describe('get_trigger_type_suggestions', () => {
  const mockRange: monaco.IRange = {
    startLineNumber: 1,
    endLineNumber: 1,
    startColumn: 6,
    endColumn: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTriggerDefinitions.mockReturnValue([]);
    mockGetTriggerDefinition.mockReturnValue(undefined);
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
        expect(result).toHaveLength(3);
        expect(result.map((s) => s.label)).toEqual(
          expect.arrayContaining(['alert', 'scheduled', 'manual'])
        );
      });

      it('should filter trigger types by technical id prefix (case-insensitive)', () => {
        const result = getTriggerTypeSuggestions('ale', mockRange);
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('alert');
        expect(result[0].detail).toBe('Alert');
      });

      it('should filter trigger types by display label prefix', () => {
        const result = getTriggerTypeSuggestions('Sched', mockRange);
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('scheduled');
        expect(result[0].detail).toBe('Scheduled');
      });

      it('should filter trigger types by prefix - manual', () => {
        const result = getTriggerTypeSuggestions('man', mockRange);
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('manual');
        expect(result[0].detail).toBe('Manual');
      });

      it('should handle case-insensitive matching', () => {
        const result = getTriggerTypeSuggestions('ALERT', mockRange);
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('alert');
      });

      it('should match partial strings in the middle of the type id', () => {
        const result = getTriggerTypeSuggestions('ert', mockRange);
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('alert');
      });

      it('should return empty array when no matches found', () => {
        const result = getTriggerTypeSuggestions('xyz', mockRange);
        expect(result).toHaveLength(0);
      });
    });

    describe('registered triggers', () => {
      beforeEach(() => {
        mockGetTriggerDefinitions.mockReturnValue([
          mockTrigger({
            id: 'alerting.episodeAcked',
            title: 'Alerting - Episode acknowledged',
            description: 'Emitted when acknowledgement is removed from an alerting episode.',
            stability: 'tech_preview',
          }),
          mockTrigger({
            id: 'cases.caseCreated',
            title: 'Cases - Case created',
            description: 'Emitted when a case is created.',
            stability: 'tech_preview',
          }),
        ]);
      });

      it('should show technical ids as label with human-readable titles as detail', () => {
        const result = getTriggerTypeSuggestions('', mockRange);

        const alertingSuggestion = result.find((s) => s.label === 'alerting.episodeAcked');
        expect(alertingSuggestion).toMatchObject({
          label: 'alerting.episodeAcked',
          detail: 'Alerting - Episode acknowledged',
          filterText: 'alerting.episodeAcked',
        });

        const casesSuggestion = result.find((s) => s.label === 'cases.caseCreated');
        expect(casesSuggestion).toMatchObject({
          label: 'cases.caseCreated',
          detail: 'Cases - Case created',
        });
      });

      it('should filter registered triggers by namespace prefix', () => {
        const result = getTriggerTypeSuggestions('alerting.', mockRange);

        expect(result.map((s) => s.label)).toEqual(['alerting.episodeAcked']);
      });

      it('should filter registered triggers by title prefix', () => {
        const result = getTriggerTypeSuggestions('Cases - Case', mockRange);

        expect(result.map((s) => s.label)).toEqual(['cases.caseCreated']);
      });
    });

    describe('snippet generation', () => {
      it('should generate snippets for each trigger type', () => {
        getTriggerTypeSuggestions('', mockRange);

        expect(generateTriggerSnippet).toHaveBeenCalledTimes(3);
        expect(generateTriggerSnippet).toHaveBeenCalledWith('alert', {
          defaultCondition: undefined,
        });
        expect(generateTriggerSnippet).toHaveBeenCalledWith('scheduled', {
          defaultCondition: undefined,
        });
        expect(generateTriggerSnippet).toHaveBeenCalledWith('manual', {
          defaultCondition: undefined,
        });
      });

      it('should include generated snippets as insertText', () => {
        const result = getTriggerTypeSuggestions('', mockRange);

        const alertSuggestion = result.find((s) => s.label === 'alert');
        expect(alertSuggestion?.insertText).toContain('alert:');

        const scheduledSuggestion = result.find((s) => s.label === 'scheduled');
        expect(scheduledSuggestion?.insertText).toContain('scheduled:');

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
        expect(alertSuggestion?.documentation).toBe(
          'Trigger a workflow when an alerting rule fires'
        );

        const scheduledSuggestion = result.find((s) => s.label === 'scheduled');
        expect(scheduledSuggestion?.documentation).toContain('schedule');

        const manualSuggestion = result.find((s) => s.label === 'manual');
        expect(manualSuggestion?.documentation).toContain('manually');
      });

      it('should set detail to the human-readable trigger title', () => {
        const result = getTriggerTypeSuggestions('', mockRange);
        result.forEach((suggestion) => {
          expect(typeof suggestion.detail).toBe('string');
          expect(suggestion.detail).not.toBe(suggestion.label);
        });
      });

      it('should set sortText so built-in triggers sort before event-driven, each group alphabetical', () => {
        mockGetTriggerDefinitions.mockReturnValue([
          mockTrigger({
            id: 'alerting.ruleCreated',
            title: 'Alerting - Rule created',
            description: 'When a rule is created.',
            stability: 'tech_preview',
          }),
        ]);

        const result = getTriggerTypeSuggestions('', mockRange);
        const builtInLabels = ['alert', 'manual', 'scheduled'];
        result.forEach((suggestion) => {
          const label = getSuggestionLabel(suggestion.label);
          const prefix = builtInLabels.includes(label) ? '0_' : '1_';
          expect(suggestion.sortText).toBe(`!${prefix}${label}`);
        });
      });

      it('should set filterText to the technical trigger id for deduplication with YAML schema suggestions', () => {
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
        // Empty prefix after trim matches all built-in triggers.
        expect(result).toHaveLength(3);
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
          expect.objectContaining({
            type: 'alert',
            label: 'Alert',
            icon: monaco.languages.CompletionItemKind.Customcolor,
          }),
          expect.objectContaining({
            type: 'scheduled',
            label: 'Scheduled',
            icon: monaco.languages.CompletionItemKind.Operator,
          }),
          expect.objectContaining({
            type: 'manual',
            label: 'Manual',
            icon: monaco.languages.CompletionItemKind.TypeParameter,
          }),
        ])
      );
    });

    it('should cache the result and return same instance on subsequent calls', () => {
      const result1 = getBuiltInTriggerTypesFromSchema();
      const result2 = getBuiltInTriggerTypesFromSchema();
      expect(result1).toBe(result2);
    });

    it('should return trigger types with correct properties', () => {
      const result = getBuiltInTriggerTypesFromSchema();
      result.forEach((triggerType) => {
        expect(triggerType).toHaveProperty('type');
        expect(triggerType).toHaveProperty('label');
        expect(triggerType).toHaveProperty('description');
        expect(triggerType).toHaveProperty('icon');
        expect(typeof triggerType.type).toBe('string');
        expect(typeof triggerType.label).toBe('string');
        expect(typeof triggerType.description).toBe('string');
        expect(typeof triggerType.icon).toBe('number');
      });
    });
  });
});
