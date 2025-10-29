/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { z } from '@kbn/zod';
import { getVariableSuggestions } from './get_variable_suggestions';
import type { AutocompleteContext } from '../autocomplete.types';
import type { VariableLineParseResult } from '../parse_line_for_completion';

describe('getVariableSuggestions', () => {
  const mockRange: monaco.IRange = {
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: 1,
    endColumn: 5,
  };

  const createMockContext = (
    overrides: Partial<AutocompleteContext> = {}
  ): AutocompleteContext => ({
    triggerCharacter: null,
    triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
    range: mockRange,
    line: '',
    lineUpToCursor: '',
    lineParseResult: null,
    contextSchema: z.object({}),
    focusedStepInfo: null,
    yamlDocument: {} as any,
    scalarType: null,
    path: [],
    absoluteOffset: 0,
    dynamicConnectorTypes: null,
    isInLiquidBlock: false,
    isInScheduledTriggerWithBlock: false,
    shouldUseCurlyBraces: true,
    shouldBeQuoted: false,
    ...overrides,
  });

  const createVariableLineParseResult = (
    overrides: Partial<VariableLineParseResult> = {}
  ): VariableLineParseResult => ({
    matchType: 'variable-unfinished',
    fullKey: '',
    match: [''] as unknown as RegExpMatchArray,
    pathSegments: null,
    lastPathSegment: null,
    ...overrides,
  });

  describe('Basic functionality', () => {
    it('should return empty array when lineParseResult is null', () => {
      const context = createMockContext({
        lineParseResult: null,
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toEqual([]);
    });

    it('should return empty array when lineParseResult is not a variable type', () => {
      const context = createMockContext({
        lineParseResult: {
          matchType: 'liquid-filter',
          fullKey: '',
          match: [''] as unknown as RegExpMatchArray,
        } as any,
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toEqual([]);
    });

    it('should return empty array when contextSchema is not a ZodObject', () => {
      const context = createMockContext({
        contextSchema: z.string(),
        lineParseResult: createVariableLineParseResult(),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toEqual([]);
    });
  });

  describe('Variable suggestions with ZodObject schema', () => {
    it('should provide all keys from ZodObject schema', () => {
      const schema = z.object({
        consts: z.object({
          apiUrl: z.string(),
          timeout: z.number(),
        }),
        event: z.object({
          type: z.string(),
        }),
        workflow: z.object({
          name: z.string(),
          version: z.string(),
        }),
      });

      const context = createMockContext({
        contextSchema: schema,
        lineParseResult: createVariableLineParseResult(),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(3);
      expect(suggestions.map((s) => s.label)).toEqual(['consts', 'event', 'workflow']);
    });

    it('should include detailed type information for each property', () => {
      const schema = z.object({
        stringProp: z.string().describe('A string property'),
        numberProp: z.number(),
        booleanProp: z.boolean(),
        objectProp: z.object({
          nested: z.string(),
        }),
        arrayProp: z.array(z.string()),
      });

      const context = createMockContext({
        contextSchema: schema,
        lineParseResult: createVariableLineParseResult(),
      });

      const suggestions = getVariableSuggestions(context);

      expect(suggestions.find((s) => s.label === 'stringProp')?.detail).toBe(
        'string // A string property: A string property'
      );
      expect(suggestions.find((s) => s.label === 'numberProp')?.detail).toBe('number');
      expect(suggestions.find((s) => s.label === 'booleanProp')?.detail).toBe('boolean');
      expect(suggestions.find((s) => s.label === 'objectProp')?.detail).toContain(
        '{  nested: string}'
      );
      expect(suggestions.find((s) => s.label === 'arrayProp')?.detail).toBe('string[]');
    });
  });

  describe('Filtering suggestions', () => {
    const schema = z.object({
      apiUrl: z.string(),
      apiKey: z.string(),
      timeout: z.number(),
      retryCount: z.number(),
    });

    it('should filter suggestions based on lastPathSegment', () => {
      const context = createMockContext({
        contextSchema: schema,
        lineParseResult: createVariableLineParseResult({
          lastPathSegment: 'api',
          fullKey: 'api',
        }),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(2);
      expect(suggestions.map((s) => s.label)).toEqual(['apiUrl', 'apiKey']);
    });

    it('should return all suggestions only when lastPathSegment is null and fullKey is empty', () => {
      const context = createMockContext({
        contextSchema: schema,
        lineParseResult: createVariableLineParseResult({
          lastPathSegment: null,
        }),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(4);
    });

    it('should not return all suggestions when we already inside a nested property', () => {
      const context = createMockContext({
        contextSchema: schema,
        lineParseResult: createVariableLineParseResult({
          fullKey: 'docs.apiUrl',
          lastPathSegment: 'apiUrl',
        }),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(0);
    });

    it('should return empty array when no keys match lastPathSegment', () => {
      const context = createMockContext({
        contextSchema: schema,
        lineParseResult: createVariableLineParseResult({
          fullKey: 'xyz',
          lastPathSegment: 'xyz',
        }),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('Trigger character handling', () => {
    const schema = z.object({
      consts: z.object({ value: z.string() }),
    });

    it('should handle @ trigger character', () => {
      const context = createMockContext({
        contextSchema: schema,
        triggerCharacter: '@',
        lineParseResult: createVariableLineParseResult(),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(1);

      const suggestion = suggestions[0];
      expect(suggestion.insertText).toBe('{{ consts$0 }}');
      expect(suggestion.insertTextRules).toBe(
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      );
    });

    it('should handle @ trigger without curly braces when shouldUseCurlyBraces is false', () => {
      const context = createMockContext({
        contextSchema: schema,
        triggerCharacter: '@',
        shouldUseCurlyBraces: false,
        lineParseResult: createVariableLineParseResult(),
      });

      const suggestions = getVariableSuggestions(context);
      const suggestion = suggestions[0];
      expect(suggestion.insertText).toBe('consts$0');
    });

    it('should handle . trigger character', () => {
      const context = createMockContext({
        contextSchema: schema,
        triggerCharacter: '.',
        lineParseResult: createVariableLineParseResult(),
      });

      const suggestions = getVariableSuggestions(context);
      const suggestion = suggestions[0];
      expect(suggestion.insertText).toBe('consts');
      expect(suggestion.insertTextRules).toBe(monaco.languages.CompletionItemInsertTextRule.None);
    });
  });

  describe('Quote handling', () => {
    const schema = z.object({
      normalKey: z.string(),
    });

    it('should add quotes when shouldBeQuoted is true', () => {
      const context = createMockContext({
        contextSchema: schema,
        shouldBeQuoted: true,
        lineParseResult: createVariableLineParseResult(),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions[0].insertText).toBe('"normalKey"');
    });

    it('should add quotes around @ trigger expression when shouldBeQuoted is true', () => {
      const context = createMockContext({
        contextSchema: schema,
        triggerCharacter: '@',
        shouldBeQuoted: true,
        lineParseResult: createVariableLineParseResult(),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions[0].insertText).toBe('"{{ normalKey$0 }}"');
    });
  });

  describe('Properties requiring bracket notation', () => {
    const schema = z.object({
      'kebab-case-key': z.string(),
      'key.with.dots': z.string(),
      'key with spaces': z.string(),
      normalKey: z.string(),
    });

    it('should use bracket notation for non-identifier keys', () => {
      const context = createMockContext({
        contextSchema: schema,
        lineParseResult: createVariableLineParseResult(),
      });

      const suggestions = getVariableSuggestions(context);

      expect(suggestions.find((s) => s.label === 'kebab-case-key')?.insertText).toBe(
        '["kebab-case-key"]'
      );
      // key.with.dots actually passes PROPERTY_PATH_REGEX because it looks like nested property access
      expect(suggestions.find((s) => s.label === 'key.with.dots')?.insertText).toBe(
        'key.with.dots'
      );
      expect(suggestions.find((s) => s.label === 'key with spaces')?.insertText).toBe(
        '["key with spaces"]'
      );
      expect(suggestions.find((s) => s.label === 'normalKey')?.insertText).toBe('normalKey');
    });

    it('should use single quotes in bracket notation when in double-quoted string', () => {
      const context = createMockContext({
        contextSchema: schema,
        scalarType: 'QUOTE_DOUBLE' as any,
        lineParseResult: createVariableLineParseResult(),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions.find((s) => s.label === 'kebab-case-key')?.insertText).toBe(
        "['kebab-case-key']"
      );
    });

    it('should use double quotes in bracket notation when in single-quoted string', () => {
      const context = createMockContext({
        contextSchema: schema,
        scalarType: 'QUOTE_SINGLE' as any,
        lineParseResult: createVariableLineParseResult(),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions.find((s) => s.label === 'kebab-case-key')?.insertText).toBe(
        '["kebab-case-key"]'
      );
    });

    it('should not use dot notation for bracket-notation keys with @ trigger', () => {
      const context = createMockContext({
        contextSchema: schema,
        triggerCharacter: '@',
        lineParseResult: createVariableLineParseResult(),
      });

      const suggestions = getVariableSuggestions(context);
      const kebabSuggestion = suggestions.find((s) => s.label === 'kebab-case-key');

      expect(kebabSuggestion?.insertText).toBe('{{ kebab-case-key$0 }}');
      expect(kebabSuggestion?.additionalTextEdits).toHaveLength(1);
      expect(kebabSuggestion?.additionalTextEdits?.[0].text).toBe('');
    });
  });

  describe('Complex nested schemas', () => {
    it('should handle deeply nested ZodObject schemas', () => {
      const schema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.object({
              value: z.string(),
            }),
          }),
        }),
      });

      const context = createMockContext({
        contextSchema: schema,
        lineParseResult: createVariableLineParseResult(),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].label).toBe('level1');
      expect(suggestions[0].detail).toContain('{  level2: {  level3: {  value: string}}}');
    });

    it('should handle ZodObject with optional and nullable properties', () => {
      const schema = z.object({
        requiredProp: z.string(),
        optionalProp: z.string().optional(),
        nullableProp: z.string().nullable(),
        optionalNullableProp: z.string().optional().nullable(),
      });

      const context = createMockContext({
        contextSchema: schema,
        lineParseResult: createVariableLineParseResult(),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(4);

      // All properties should be suggested regardless of optionality
      expect(suggestions.map((s) => s.label)).toEqual([
        'requiredProp',
        'optionalProp',
        'nullableProp',
        'optionalNullableProp',
      ]);
    });

    it('should handle ZodObject with union types', () => {
      const schema = z.object({
        unionProp: z.union([z.string(), z.number()]),
        literalUnion: z.union([z.literal('a'), z.literal('b')]),
      });

      const context = createMockContext({
        contextSchema: schema,
        lineParseResult: createVariableLineParseResult(),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(2);

      expect(suggestions.find((s) => s.label === 'unionProp')?.detail).toContain('string | number');
      expect(suggestions.find((s) => s.label === 'literalUnion')?.detail).toContain('"a" | "b"');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty ZodObject schema', () => {
      const schema = z.object({});

      const context = createMockContext({
        contextSchema: schema,
        lineParseResult: createVariableLineParseResult(),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toEqual([]);
    });

    it('should handle properties with undefined descriptions', () => {
      const schema = z.object({
        propWithoutDescription: z.string(),
        propWithDescription: z.string().describe('This has a description'),
      });

      const context = createMockContext({
        contextSchema: schema,
        lineParseResult: createVariableLineParseResult(),
      });

      const suggestions = getVariableSuggestions(context);

      const withoutDesc = suggestions.find((s) => s.label === 'propWithoutDescription');
      const withDesc = suggestions.find((s) => s.label === 'propWithDescription');

      expect(withoutDesc?.detail).toBe('string');
      expect(withDesc?.detail).toBe('string // This has a description: This has a description');
    });

    it('should handle empty string lastPathSegment', () => {
      const schema = z.object({
        prop1: z.string(),
        prop2: z.string(),
      });

      const context = createMockContext({
        contextSchema: schema,
        lineParseResult: createVariableLineParseResult({
          lastPathSegment: '',
        }),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(2);
    });
  });

  describe('matchType variations', () => {
    const schema = z.object({
      testProp: z.string(),
    });

    it('should handle at matchType', () => {
      const context = createMockContext({
        contextSchema: schema,
        lineParseResult: createVariableLineParseResult({
          matchType: 'at',
        }),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(1);
    });

    it('should handle variable-unfinished matchType', () => {
      const context = createMockContext({
        contextSchema: schema,
        lineParseResult: createVariableLineParseResult({
          matchType: 'variable-unfinished',
        }),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(1);
    });

    it('should handle foreach-variable matchType', () => {
      const context = createMockContext({
        contextSchema: schema,
        lineParseResult: createVariableLineParseResult({
          matchType: 'foreach-variable' as any,
        }),
      });

      const suggestions = getVariableSuggestions(context);
      expect(suggestions).toHaveLength(1);
    });
  });
});
