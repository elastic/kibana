/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getJsonSchemaSuggestions } from './get_json_schema_suggestions';
import type { ExtendedAutocompleteContext } from '../../context/autocomplete.types';

describe('getJsonSchemaSuggestions', () => {
  const createMockContext = (
    path: (string | number)[],
    lineUpToCursor: string,
    line: string = lineUpToCursor,
    lineParseResult: ExtendedAutocompleteContext['lineParseResult'] = null
  ): ExtendedAutocompleteContext => {
    return {
      triggerCharacter: null,
      triggerKind: null,
      line,
      lineUpToCursor,
      lineParseResult,
      path,
      range: {
        startLineNumber: 1,
        endLineNumber: 1,
        startColumn: 1,
        endColumn: line.length + 1,
      },
      absoluteOffset: 0,
      focusedStepInfo: null,
      focusedYamlPair: null,
      contextSchema: {} as any,
      contextScopedToPath: null,
      yamlDocument: {} as any,
      yamlLineCounter: null,
      scalarType: null,
      isInLiquidBlock: false,
      isInTriggersContext: false,
      isInScheduledTriggerWithBlock: false,
      isInStepsContext: false,
      dynamicConnectorTypes: null,
      workflowDefinition: null,
      model: {} as any,
      position: {
        lineNumber: 1,
        column: line.length + 1,
      } as any,
    };
  };

  describe('property key suggestions', () => {
    it('should provide property key suggestions on empty line after property definition', () => {
      const context = createMockContext(
        ['inputs', 'properties'],
        '      ' // 6 spaces - empty line after property
      );

      const suggestions = getJsonSchemaSuggestions(context);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.label === 'type')).toBe(true);
      expect(suggestions.some((s) => s.label === 'default')).toBe(true);
      expect(suggestions.some((s) => s.label === 'format')).toBe(true);
    });

    it('should provide property key suggestions when typing property key', () => {
      const context = createMockContext(
        ['inputs', 'properties', 'x'],
        '      type' // typing "type"
      );

      const suggestions = getJsonSchemaSuggestions(context);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.label === 'type')).toBe(true);
    });

    it('should NOT provide property key suggestions when line has property key with colon', () => {
      const context = createMockContext(
        ['inputs', 'properties'],
        '      type: ' // property key with colon - should show value suggestions instead
      );

      const suggestions = getJsonSchemaSuggestions(context);

      // Should not have property key suggestions when we have "type: "
      expect(suggestions.some((s) => s.insertText === 'type: ')).toBe(false);
    });
  });

  describe('type value suggestions', () => {
    it('should provide type value suggestions when typing after "type:"', () => {
      const lineUpToCursor = '      type: ';
      const typeMatch = lineUpToCursor.match(/^(?<prefix>\s*-?\s*type:)\s*(?<value>.*)$/);
      const context = createMockContext(
        ['inputs', 'properties', 'x'],
        lineUpToCursor,
        lineUpToCursor,
        typeMatch
          ? {
              matchType: 'type' as const,
              fullKey: typeMatch.groups?.value?.replace(/['"]/g, '').trim() || '',
              match: typeMatch,
              valueStartIndex: (typeMatch.groups?.prefix?.length || 0) + 1,
            }
          : null
      );

      const suggestions = getJsonSchemaSuggestions(context);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.label === 'string')).toBe(true);
      expect(suggestions.some((s) => s.label === 'number')).toBe(true);
      expect(suggestions.some((s) => s.label === 'boolean')).toBe(true);
    });
  });

  describe('format value suggestions', () => {
    it('should provide format value suggestions when typing after "format:"', () => {
      const context = createMockContext(['inputs', 'properties', 'x'], '      format: ');

      const suggestions = getJsonSchemaSuggestions(context);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.label === 'email')).toBe(true);
      expect(suggestions.some((s) => s.label === 'uri')).toBe(true);
      expect(suggestions.some((s) => s.label === 'date-time')).toBe(true);
    });
  });

  describe('empty path inference', () => {
    it('should infer path from indentation when path is empty on empty line after property', () => {
      const mockModel = {
        getLineContent: (lineNum: number) => {
          if (lineNum === 1) return '    x:';
          if (lineNum === 2) return '      ';
          return '';
        },
      } as any;

      const context = createMockContext([], '      ', '      ');
      context.model = mockModel;
      context.position = { lineNumber: 2, column: 7 } as any;

      const suggestions = getJsonSchemaSuggestions(context);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.label === 'type')).toBe(true);
      expect(suggestions.some((s) => s.label === 'default')).toBe(true);
    });

    it('should infer path from properties line when path is empty', () => {
      const mockModel = {
        getLineContent: (lineNum: number) => {
          if (lineNum === 1) return '  properties:';
          if (lineNum === 2) return '      ';
          return '';
        },
      } as any;

      const context = createMockContext([], '      ', '      ');
      context.model = mockModel;
      context.position = { lineNumber: 2, column: 7 } as any;

      const suggestions = getJsonSchemaSuggestions(context);

      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('context validation', () => {
    it('should return empty array when not in inputs.properties context', () => {
      const context = createMockContext(['steps'], '      ');

      const suggestions = getJsonSchemaSuggestions(context);

      expect(suggestions).toEqual([]);
    });

    it('should return empty array when in triggers context', () => {
      const context = createMockContext(['inputs', 'properties', 'x'], '      type');
      context.isInTriggersContext = true;

      const suggestions = getJsonSchemaSuggestions(context);

      expect(suggestions).toEqual([]);
    });
  });
});
