/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Document, Scalar } from 'yaml';
import { monaco } from '@kbn/monaco';
import { z } from '@kbn/zod';
import { getVariableSuggestions } from './get_variable_suggestions';
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
    scalarType: Scalar.QUOTE_DOUBLE,
    path: ['steps', 0, 'with', 'message'],
    absoluteOffset: 50,
    dynamicConnectorTypes: null,
    isInLiquidBlock: false,
    isInScheduledTriggerWithBlock: false,
    isInStepsContext: false,
    isInTriggersContext: false,
    shouldUseCurlyBraces: true,
    shouldBeQuoted: false,
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
    it('should use correct formatting options from context', () => {
      const context = createMockAutocompleteContext({
        shouldBeQuoted: true,
        shouldUseCurlyBraces: false,
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(3);
      expect(suggestions.map((s) => s.label)).toEqual(['apiUrl', 'apiKey', 'timeout']);
      // The actual formatting is handled by wrapAsMonacoSuggestion
      // We just verify that suggestions are generated
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
});
