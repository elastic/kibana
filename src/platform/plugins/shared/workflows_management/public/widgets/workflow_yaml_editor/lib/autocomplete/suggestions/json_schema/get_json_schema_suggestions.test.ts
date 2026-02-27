/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
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

  describe('enum value suggestions', () => {
    it('should provide enum value suggestions when in enum array context', () => {
      const context = createMockContext(
        ['inputs', 'properties', 'status', 'enum', 0],
        '        - '
      );
      context.workflowDefinition = {
        inputs: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'pending'],
            },
          },
        },
      } as any;

      const suggestions = getJsonSchemaSuggestions(context);

      expect(suggestions.length).toBe(3);
      expect(suggestions.map((s) => s.label)).toEqual(['active', 'inactive', 'pending']);
      expect(
        suggestions.every((s) => s.kind === monaco.languages.CompletionItemKind.EnumMember)
      ).toBe(true);
    });

    it('should provide numeric enum value suggestions', () => {
      const context = createMockContext(
        ['inputs', 'properties', 'priority', 'enum', 0],
        '        - '
      );
      context.workflowDefinition = {
        inputs: {
          type: 'object',
          properties: {
            priority: {
              type: 'integer',
              enum: [1, 2, 3],
            },
          },
        },
      } as any;

      const suggestions = getJsonSchemaSuggestions(context);

      expect(suggestions.length).toBe(3);
      expect(suggestions.map((s) => s.label)).toEqual(['1', '2', '3']);
      expect(suggestions.map((s) => s.insertText)).toEqual(['1', '2', '3']);
    });

    it('should wrap string enum values in quotes', () => {
      const context = createMockContext(
        ['inputs', 'properties', 'status', 'enum', 0],
        '        - '
      );
      context.workflowDefinition = {
        inputs: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['active'],
            },
          },
        },
      } as any;

      const suggestions = getJsonSchemaSuggestions(context);

      expect(suggestions[0].insertText).toBe('"active"');
    });

    it('should return empty when no workflow definition', () => {
      const context = createMockContext(
        ['inputs', 'properties', 'status', 'enum', 0],
        '        - '
      );

      const suggestions = getJsonSchemaSuggestions(context);

      expect(suggestions).toEqual([]);
    });

    it('should return empty when property has no enum values', () => {
      const context = createMockContext(['inputs', 'properties', 'name', 'enum', 0], '        - ');
      context.workflowDefinition = {
        inputs: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
          },
        },
      } as any;

      const suggestions = getJsonSchemaSuggestions(context);

      expect(suggestions).toEqual([]);
    });
  });

  describe('context validation', () => {
    it('should return empty when not in enum context', () => {
      const context = createMockContext(['inputs', 'properties', 'status'], '      ');

      const suggestions = getJsonSchemaSuggestions(context);

      expect(suggestions).toEqual([]);
    });

    it('should return empty for steps context', () => {
      const context = createMockContext(['steps'], '      ');

      const suggestions = getJsonSchemaSuggestions(context);

      expect(suggestions).toEqual([]);
    });

    it('should return empty for triggers context', () => {
      const context = createMockContext(['triggers'], '      ');

      const suggestions = getJsonSchemaSuggestions(context);

      expect(suggestions).toEqual([]);
    });

    it('should return empty when line does not match list item pattern', () => {
      const context = createMockContext(
        ['inputs', 'properties', 'status', 'enum', 0],
        '        active' // no "- " prefix
      );
      context.workflowDefinition = {
        inputs: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['active'],
            },
          },
        },
      } as any;

      const suggestions = getJsonSchemaSuggestions(context);

      expect(suggestions).toEqual([]);
    });
  });
});
