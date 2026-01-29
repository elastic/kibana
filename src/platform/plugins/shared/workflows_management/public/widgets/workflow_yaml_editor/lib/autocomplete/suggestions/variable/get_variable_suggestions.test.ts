/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Document, LineCounter, Scalar } from 'yaml';
import { monaco } from '@kbn/monaco';
import { z } from '@kbn/zod/v4';
import { getVariableSuggestions } from './get_variable_suggestions';
import type { StepPropInfo } from '../../../../../../entities/workflows/store';
import type { AutocompleteContext } from '../../context/autocomplete.types';
import type {
  ForeachVariableLineParseResult,
  VariableLineParseResult,
} from '../../context/parse_line_for_completion';

describe('getVariableSuggestions', () => {
  const createMockRange = (): monaco.IRange => ({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: 1,
    endColumn: 10,
  });

  const createMockVariableLineParseResult = (
    overrides?: Partial<VariableLineParseResult>
  ): VariableLineParseResult => ({
    matchType: 'variable-unfinished',
    match: {} as RegExpMatchArray, // Mock the match object
    fullKey: 'consts',
    pathSegments: ['consts'],
    lastPathSegment: null,
    ...overrides,
  });

  const createMockAutocompleteContext = (
    overrides?: Partial<AutocompleteContext>
  ): AutocompleteContext => ({
    triggerCharacter: '.',
    triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
    range: createMockRange(),
    line: 'message: "{{ consts.',
    lineUpToCursor: 'message: "{{ consts.',
    lineParseResult: createMockVariableLineParseResult(),
    contextSchema: z.object({
      apiUrl: z.string().describe('The API URL'),
      apiKey: z.string().describe('The API key'),
      timeout: z.number().describe('Request timeout in seconds'),
    }),
    contextScopedToPath: 'consts',
    focusedStepInfo: null,
    yamlDocument: new Document(),
    yamlLineCounter: new LineCounter(),
    focusedYamlPair: null,
    scalarType: Scalar.QUOTE_DOUBLE,
    path: ['steps', 0, 'with', 'message'],
    absoluteOffset: 50,
    dynamicConnectorTypes: null,
    isInLiquidBlock: false,
    isInScheduledTriggerWithBlock: false,
    isInStepsContext: false,
    isInTriggersContext: false,
    workflowDefinition: null,
    ...overrides,
  });

  describe('basic functionality', () => {
    it('should return suggestions for object properties', () => {
      const context = createMockAutocompleteContext();
      const suggestions = getVariableSuggestions(context);

      expect(suggestions).toHaveLength(3);
      expect(suggestions.map((s) => s.label)).toEqual(['apiUrl', 'apiKey', 'timeout']);
    });

    it('should include property descriptions in suggestions', () => {
      const context = createMockAutocompleteContext();
      const suggestions = getVariableSuggestions(context);

      const apiUrlSuggestion = suggestions.find((s) => s.label === 'apiUrl');
      expect(apiUrlSuggestion?.detail).toBe('string // The API URL: The API URL');

      const timeoutSuggestion = suggestions.find((s) => s.label === 'timeout');
      expect(timeoutSuggestion?.detail).toBe(
        'number // Request timeout in seconds: Request timeout in seconds'
      );
    });

    it('should filter suggestions based on lastPathSegment', () => {
      const context = createMockAutocompleteContext({
        lineParseResult: createMockVariableLineParseResult({
          lastPathSegment: 'api',
        }),
      });

      const suggestions = getVariableSuggestions(context);

      expect(suggestions).toHaveLength(2);
      expect(suggestions.map((s) => s.label)).toEqual(['apiUrl', 'apiKey']);
    });

    it('should handle nested object schemas', () => {
      const nestedSchema = z.object({
        steps: z.object({
          step1: z.object({
            output: z.object({
              data: z.string(),
              status: z.number(),
            }),
          }),
        }),
      });

      const context = createMockAutocompleteContext({
        contextSchema: nestedSchema.shape.steps.shape.step1.shape.output,
        contextScopedToPath: 'steps.step1.output',
        lineParseResult: createMockVariableLineParseResult({
          fullKey: 'steps.step1.output',
        }),
      });

      const suggestions = getVariableSuggestions(context);

      expect(suggestions).toHaveLength(2);
      expect(suggestions.map((s) => s.label)).toEqual(['data', 'status']);
    });
  });

  describe('edge cases', () => {
    it('should return empty array when lineParseResult is null', () => {
      const context = createMockAutocompleteContext({
        lineParseResult: null,
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toEqual([]);
    });

    it('should return empty array when lineParseResult is not a variable type', () => {
      const context = createMockAutocompleteContext({
        lineParseResult: {
          matchType: 'type',
          match: null,
          fullKey: 'webhook',
        } as any,
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toEqual([]);
    });

    it('should return empty array when contextSchema is not a ZodObject', () => {
      const context = createMockAutocompleteContext({
        contextSchema: z.string(),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toEqual([]);
    });

    it('should return empty array when ZodObject has no shape', () => {
      const context = createMockAutocompleteContext({
        contextSchema: z.object({}),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toEqual([]);
    });

    it('should return all keys when lastPathSegment is null', () => {
      const context = createMockAutocompleteContext({
        lineParseResult: createMockVariableLineParseResult({
          lastPathSegment: null,
        }),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(3);
      expect(suggestions.map((s) => s.label)).toEqual(['apiUrl', 'apiKey', 'timeout']);
    });

    it('should return empty array when lastPathSegment has no matches', () => {
      const context = createMockAutocompleteContext({
        lineParseResult: createMockVariableLineParseResult({
          lastPathSegment: 'xyz',
        }),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toEqual([]);
    });
  });

  describe('non-existent path handling', () => {
    it('should return empty array when accessing non-existent path with multiple segments', () => {
      const context = createMockAutocompleteContext({
        lineParseResult: createMockVariableLineParseResult({
          fullKey: 'consts.docs.a',
          pathSegments: ['consts', 'docs', 'a'],
          lastPathSegment: 'a',
        }),
        contextScopedToPath: 'consts',
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toEqual([]);
    });

    it('should return empty array when typing dot after non-existent path', () => {
      const context = createMockAutocompleteContext({
        lineParseResult: createMockVariableLineParseResult({
          fullKey: 'consts.docs',
          pathSegments: ['consts', 'docs'],
          lastPathSegment: null,
        }),
        contextScopedToPath: 'consts',
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toEqual([]);
    });

    it('should filter suggestions when typing a prefix', () => {
      const context = createMockAutocompleteContext({
        lineParseResult: createMockVariableLineParseResult({
          fullKey: 'consts.api',
          pathSegments: ['consts', 'api'],
          lastPathSegment: 'api',
        }),
        contextScopedToPath: 'consts',
      });

      // 'api' filters to show 'apiUrl' and 'apiKey' since they start with 'api'
      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(2);
      expect(suggestions.map((s) => s.label)).toEqual(['apiUrl', 'apiKey']);
    });

    it('should return empty array when accessing truly non-existent path', () => {
      const context = createMockAutocompleteContext({
        lineParseResult: createMockVariableLineParseResult({
          fullKey: 'consts.nonExistent.something',
          pathSegments: ['consts', 'nonExistent', 'something'],
          lastPathSegment: 'something',
        }),
        contextScopedToPath: 'consts',
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toEqual([]);
    });

    it('should handle empty contextScopedToPath (root level)', () => {
      const context = createMockAutocompleteContext({
        lineParseResult: createMockVariableLineParseResult({
          fullKey: 'consts',
          pathSegments: ['consts'],
          lastPathSegment: 'consts',
        }),
        contextScopedToPath: '',
        contextSchema: z.object({
          consts: z.object({
            test: z.string(),
          }),
        }),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].label).toBe('consts');
    });

    it('should handle null contextScopedToPath', () => {
      const context = createMockAutocompleteContext({
        lineParseResult: createMockVariableLineParseResult({
          fullKey: 'nonexistent',
        }),
        contextScopedToPath: null,
      });

      const suggestions = getVariableSuggestions(context);
      // When contextScopedToPath is null, the non-existent path check is skipped
      expect(suggestions).toHaveLength(3);
      expect(suggestions.map((s) => s.label)).toEqual(['apiUrl', 'apiKey', 'timeout']);
    });

    it('should handle empty fullKey string', () => {
      const context = createMockAutocompleteContext({
        lineParseResult: createMockVariableLineParseResult({
          fullKey: '',
        }),
        contextScopedToPath: 'consts',
      });

      const suggestions = getVariableSuggestions(context);
      // When fullKey is empty, path validation should pass and show all properties
      expect(suggestions).toHaveLength(3);
      expect(suggestions.map((s) => s.label)).toEqual(['apiUrl', 'apiKey', 'timeout']);
    });

    it('should allow suggestions when fullKey exactly matches contextScopedToPath', () => {
      const context = createMockAutocompleteContext({
        lineParseResult: createMockVariableLineParseResult({
          fullKey: 'consts',
          pathSegments: ['consts'],
          lastPathSegment: null,
        }),
        contextScopedToPath: 'consts',
      });

      const suggestions = getVariableSuggestions(context);
      // When fullKey exactly matches contextScopedToPath (segmentDiff === 0),
      // we should show all properties of that level
      expect(suggestions).toHaveLength(3);
      expect(suggestions.map((s) => s.label)).toEqual(['apiUrl', 'apiKey', 'timeout']);
    });

    it('should allow suggestions when typing next valid segment (segmentDiff === 1 with lastPathSegment)', () => {
      const context = createMockAutocompleteContext({
        lineParseResult: createMockVariableLineParseResult({
          fullKey: 'consts.api',
          pathSegments: ['consts', 'api'],
          lastPathSegment: 'api',
        }),
        contextScopedToPath: 'consts',
      });

      const suggestions = getVariableSuggestions(context);
      // When segmentDiff === 1 and lastPathSegment is not null,
      // we're typing the next valid segment, so suggestions should be filtered
      expect(suggestions).toHaveLength(2);
      expect(suggestions.map((s) => s.label)).toEqual(['apiUrl', 'apiKey']);
    });
  });

  describe('different variable match types', () => {
    it('should handle variable-complete match type', () => {
      const context = createMockAutocompleteContext({
        lineParseResult: createMockVariableLineParseResult({
          matchType: 'variable-complete',
        }),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(3);
      expect(suggestions.map((s) => s.label)).toEqual(['apiUrl', 'apiKey', 'timeout']);
    });

    it('should handle at match type', () => {
      const context = createMockAutocompleteContext({
        lineParseResult: createMockVariableLineParseResult({
          matchType: 'at',
        }),
        triggerCharacter: '@',
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(3);
      expect(suggestions.map((s) => s.label)).toEqual(['apiUrl', 'apiKey', 'timeout']);
    });

    it('should handle foreach-variable match type', () => {
      const context = createMockAutocompleteContext({
        lineParseResult: {
          matchType: 'foreach-variable',
          match: null,
          fullKey: 'consts',
          pathSegments: ['consts'],
          lastPathSegment: null,
        } as ForeachVariableLineParseResult,
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(3);
      expect(suggestions.map((s) => s.label)).toEqual(['apiUrl', 'apiKey', 'timeout']);
    });
  });

  describe('suggestion formatting', () => {
    it('should quote insertText if scalarType is PLAIN and value starts with @', () => {
      const context = createMockAutocompleteContext({
        triggerCharacter: '@',
        triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
        line: 'message: @',
        lineUpToCursor: 'message: @',
        lineParseResult: createMockVariableLineParseResult({
          matchType: 'at',
        }),
        scalarType: Scalar.PLAIN,
        focusedYamlPair: {
          path: ['steps', 0, 'with', 'message'],
          keyNode: {
            value: 'message',
          },
          valueNode: {
            value: '@co',
          },
        } as StepPropInfo,
        contextSchema: z.object({
          consts: z.object({
            test: z.string(),
          }),
        }),
        contextScopedToPath: null,
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(1);
      expect(suggestions.map((s) => s.label)).toEqual(['consts']);
      expect(suggestions.map((s) => s.insertText)).toEqual(['"{{ consts$0 }}"']);
      // The actual formatting is handled by wrapAsMonacoSuggestion
      // We just verify that suggestions are generated
    });

    it('should not quote insertText by default', () => {
      const context = createMockAutocompleteContext({
        triggerCharacter: '.',
        triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
        range: createMockRange(),
        line: 'message: {{ consts.',
        lineUpToCursor: 'message: {{ consts.',
        lineParseResult: createMockVariableLineParseResult(),
        contextSchema: z.object({
          apiUrl: z.string().describe('The API URL'),
          apiKey: z.string().describe('The API key'),
          timeout: z.number().describe('Request timeout in seconds'),
        }),
        contextScopedToPath: 'consts',
        focusedStepInfo: null,
        yamlDocument: new Document(),
        focusedYamlPair: {
          path: ['steps', 0, 'with', 'message'],
          keyNode: {
            value: 'message',
          },
          valueNode: {
            value: '{{ consts.',
          },
        } as StepPropInfo,
        scalarType: Scalar.PLAIN,
        path: ['steps', 0, 'with', 'message'],
        absoluteOffset: 50,
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(3);
      expect(suggestions.map((s) => s.label)).toEqual(['apiUrl', 'apiKey', 'timeout']);
    });

    it('should handle different scalar types', () => {
      const context = createMockAutocompleteContext({
        scalarType: Scalar.QUOTE_SINGLE,
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(3);
      expect(suggestions.map((s) => s.label)).toEqual(['apiUrl', 'apiKey', 'timeout']);
    });
  });

  describe('complex schema types', () => {
    it('should handle optional fields', () => {
      const schema = z.object({
        config: z.object({
          requiredField: z.string(),
          optionalField: z.string().optional(),
        }),
      });

      const context = createMockAutocompleteContext({
        contextSchema: schema.shape.config,
        contextScopedToPath: 'config',
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(2);
      expect(suggestions.map((s) => s.label)).toContain('requiredField');
      expect(suggestions.map((s) => s.label)).toContain('optionalField');
    });

    it('should handle union types', () => {
      const schema = z.object({
        data: z.object({
          value: z.union([z.string(), z.number()]),
        }),
      });

      const context = createMockAutocompleteContext({
        contextSchema: schema.shape.data,
        contextScopedToPath: 'data',
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].label).toBe('value');
      expect(suggestions[0].detail).toContain('string | number');
    });
  });

  describe('@ completion curly braces handling', () => {
    it('should NOT add curly braces when already inside {{ }}', () => {
      const context = createMockAutocompleteContext({
        triggerCharacter: '@',
        line: 'message: "{{ consts.@',
        lineUpToCursor: 'message: "{{ consts.@',
        lineParseResult: createMockVariableLineParseResult({
          matchType: 'at',
        }),
        focusedYamlPair: {
          path: ['steps', 0, 'with', 'message'],
          keyNode: {
            value: 'message',
          },
          valueNode: {
            value: '{{ consts.@',
          },
        } as StepPropInfo,
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions.length).toBeGreaterThan(0);
      // All suggestions should NOT have curly braces in insertText
      suggestions.forEach((suggestion) => {
        expect(suggestion.insertText).not.toContain('{{');
        expect(suggestion.insertText).not.toContain('}}');
      });
    });

    it('should add curly braces when NOT inside existing braces', () => {
      const context = createMockAutocompleteContext({
        triggerCharacter: '@',
        line: 'message: @',
        lineUpToCursor: 'message: @',
        lineParseResult: createMockVariableLineParseResult({
          matchType: 'at',
        }),
        focusedYamlPair: {
          path: ['steps', 0, 'with', 'message'],
          keyNode: {
            value: 'message',
          },
          valueNode: {
            value: '@',
          },
        } as StepPropInfo,
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions.length).toBeGreaterThan(0);
      // All suggestions should have curly braces in insertText
      suggestions.forEach((suggestion) => {
        expect(suggestion.insertText).toContain('{{');
        expect(suggestion.insertText).toContain('}}');
      });
    });

    it('should handle nested braces correctly', () => {
      const context = createMockAutocompleteContext({
        triggerCharacter: '@',
        line: 'message: "{{ outer {{ consts.@',
        lineUpToCursor: 'message: "{{ outer {{ consts.@',
        lineParseResult: createMockVariableLineParseResult({
          matchType: 'at',
        }),
        focusedYamlPair: {
          path: ['steps', 0, 'with', 'message'],
          keyNode: {
            value: 'message',
          },
          valueNode: {
            value: '{{ outer {{ consts.@',
          },
        } as StepPropInfo,
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions.length).toBeGreaterThan(0);
      // Should detect we're inside nested braces and not add extra braces
      suggestions.forEach((suggestion) => {
        expect(suggestion.insertText).not.toContain('{{');
        expect(suggestion.insertText).not.toContain('}}');
      });
    });

    it('should handle unclosed braces correctly', () => {
      const context = createMockAutocompleteContext({
        triggerCharacter: '@',
        line: 'message: "{{ consts.@',
        lineUpToCursor: 'message: "{{ consts.@',
        lineParseResult: createMockVariableLineParseResult({
          matchType: 'at',
        }),
        focusedYamlPair: {
          path: ['steps', 0, 'with', 'message'],
          keyNode: {
            value: 'message',
          },
          valueNode: {
            value: '{{ consts.@',
          },
        } as StepPropInfo,
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions.length).toBeGreaterThan(0);
      // Should detect we're inside unclosed braces and not add extra braces
      suggestions.forEach((suggestion) => {
        expect(suggestion.insertText).not.toContain('{{');
        expect(suggestion.insertText).not.toContain('}}');
      });
    });

    it('should handle multiple brace pairs correctly', () => {
      const context = createMockAutocompleteContext({
        triggerCharacter: '@',
        line: 'message: "{{ first }} and {{ consts.@',
        lineUpToCursor: 'message: "{{ first }} and {{ consts.@',
        lineParseResult: createMockVariableLineParseResult({
          matchType: 'at',
        }),
        focusedYamlPair: {
          path: ['steps', 0, 'with', 'message'],
          keyNode: {
            value: 'message',
          },
          valueNode: {
            value: '{{ first }} and {{ consts.@',
          },
        } as StepPropInfo,
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions.length).toBeGreaterThan(0);
      // Should detect we're inside the second pair of braces and not add extra braces
      suggestions.forEach((suggestion) => {
        expect(suggestion.insertText).not.toContain('{{');
        expect(suggestion.insertText).not.toContain('}}');
      });
    });

    it('should NOT add curly braces for foreach variables', () => {
      const context = createMockAutocompleteContext({
        triggerCharacter: '@',
        line: 'foreach: @',
        lineUpToCursor: 'foreach: @',
        lineParseResult: createMockVariableLineParseResult({
          matchType: 'at',
        }),
        focusedYamlPair: {
          path: ['steps', 0, 'with', 'foreach'],
          keyNode: {
            value: 'foreach',
          },
          valueNode: {
            value: '@',
          },
        } as StepPropInfo,
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions.length).toBeGreaterThan(0);
      // Foreach should never have curly braces
      suggestions.forEach((suggestion) => {
        expect(suggestion.insertText).not.toContain('{{');
        expect(suggestion.insertText).not.toContain('}}');
      });
    });

    it('should NOT add curly braces for non-@ match types', () => {
      const context = createMockAutocompleteContext({
        triggerCharacter: '.',
        line: 'message: "{{ consts.',
        lineUpToCursor: 'message: "{{ consts.',
        lineParseResult: createMockVariableLineParseResult({
          matchType: 'variable-unfinished',
        }),
        focusedYamlPair: {
          path: ['steps', 0, 'with', 'message'],
          keyNode: {
            value: 'message',
          },
          valueNode: {
            value: '{{ consts.',
          },
        } as StepPropInfo,
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions.length).toBeGreaterThan(0);
      // Non-@ match types should not have curly braces added
      suggestions.forEach((suggestion) => {
        expect(suggestion.insertText).not.toContain('{{');
        expect(suggestion.insertText).not.toContain('}}');
      });
    });
  });
});
