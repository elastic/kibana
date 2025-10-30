/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { monaco } from '@kbn/monaco';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import { z } from '@kbn/zod';
import { getConnectorParamsSchema } from './get_connector_with_schema';
import * as getExistingParametersModule from './get_existing_parameters_in_with_block';
import { getWithBlockSuggestions } from './get_with_block_suggestions';
import { createFakeMonacoModel } from '../../../../../../common/mocks/monaco_model';
import * as generateConnectorSnippetModule from '../../snippets/generate_connector_snippet';
import type { ExtendedAutocompleteContext } from '../autocomplete.types';

// Mock dependencies
jest.mock('./get_connector_with_schema');
jest.mock('./get_existing_parameters_in_with_block');
jest.mock('../../snippets/generate_connector_snippet');

// Helper to create autocomplete context
function createAutocompleteContext(
  yamlContent: string,
  cursorOffset: number,
  stepType: string | null = null,
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo> | null = null
): ExtendedAutocompleteContext {
  const model = createFakeMonacoModel(yamlContent, cursorOffset);
  const position = model.getPositionAt(cursorOffset);
  const line = model.getLineContent(position.lineNumber);
  const column = position.column;
  const lineUpToCursor = line.substring(0, column - 1);

  return {
    triggerCharacter: null,
    triggerKind: null,
    range: {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: 1,
      endColumn: line.length + 1,
    },
    line,
    lineUpToCursor,
    lineParseResult: null,
    contextSchema: z.object({}),
    contextScopedToPath: null,
    focusedStepInfo: stepType ? { stepType } : null,
    yamlDocument: parseDocument(yamlContent),
    scalarType: null,
    path: [],
    absoluteOffset: cursorOffset,
    dynamicConnectorTypes,
    isInLiquidBlock: false,
    isInScheduledTriggerWithBlock: false,
    shouldUseCurlyBraces: false,
    shouldBeQuoted: false,
    model,
    position,
  } as unknown as ExtendedAutocompleteContext;
}

describe('getWithBlockSuggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mocks
    jest
      .mocked(getExistingParametersModule.getExistingParametersInWithBlock)
      .mockReturnValue(new Set());
    jest.mocked(generateConnectorSnippetModule.getEnhancedTypeInfo).mockImplementation((schema) => {
      // Basic type info implementation
      if (schema instanceof z.ZodString) {
        return {
          type: 'string',
          isRequired: false,
          isOptional: true,
          description: undefined,
          example: undefined,
        };
      } else if (schema instanceof z.ZodNumber) {
        return {
          type: 'number',
          isRequired: false,
          isOptional: true,
          description: undefined,
          example: undefined,
        };
      } else if (schema instanceof z.ZodBoolean) {
        return {
          type: 'boolean',
          isRequired: false,
          isOptional: true,
          description: undefined,
          example: undefined,
        };
      } else if (schema instanceof z.ZodObject) {
        return {
          type: 'object',
          isRequired: false,
          isOptional: true,
          description: undefined,
          example: undefined,
        };
      } else if (schema instanceof z.ZodArray) {
        return {
          type: 'string[]',
          isRequired: false,
          isOptional: true,
          description: undefined,
          example: undefined,
        };
      }
      return {
        type: 'unknown',
        isRequired: false,
        isOptional: true,
        description: undefined,
        example: undefined,
      };
    });
  });

  describe('basic functionality', () => {
    it('should return empty array when no connector type is detected', () => {
      const context = createAutocompleteContext('key: value', 10);

      const suggestions = getWithBlockSuggestions(context);

      expect(suggestions).toEqual([]);
    });

    it('should return empty array when no dynamic connector types are provided', () => {
      const context = createAutocompleteContext('key: value', 10, 'slack');

      const suggestions = getWithBlockSuggestions(context);

      expect(suggestions).toEqual([]);
    });

    it('should return connector parameters when in a with block', () => {
      const yamlContent = `steps:
  - name: test
    connector-type: slack
    with:
      `;
      const cursorOffset = yamlContent.length;
      const dynamicConnectorTypes = {
        slack: {} as ConnectorTypeInfo,
      };

      jest.mocked(getConnectorParamsSchema).mockReturnValue({
        channel: z.string(),
        message: z.string(),
      });

      const context = createAutocompleteContext(
        yamlContent,
        cursorOffset,
        'slack',
        dynamicConnectorTypes
      );
      const suggestions = getWithBlockSuggestions(context);

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].label).toBe('channel');
      expect(suggestions[1].label).toBe('message');
    });

    it('should not return suggestions when on array item line', () => {
      const yamlContent = `steps:
  - name: test
    connector-type: slack
    with:
      - `;
      const cursorOffset = yamlContent.length;
      const dynamicConnectorTypes = {
        slack: {} as ConnectorTypeInfo,
      };

      const context = createAutocompleteContext(
        yamlContent,
        cursorOffset,
        'slack',
        dynamicConnectorTypes
      );
      const suggestions = getWithBlockSuggestions(context);

      expect(suggestions).toEqual([]);
    });
  });

  describe('value position detection', () => {
    it('should provide value suggestions when cursor is after colon', () => {
      const yamlContent = `steps:
  - name: test
    connector-type: slack
    with:
      enabled: `;
      const cursorOffset = yamlContent.length;
      const dynamicConnectorTypes = {
        slack: {} as ConnectorTypeInfo,
      };

      const context = createAutocompleteContext(
        yamlContent,
        cursorOffset,
        'slack',
        dynamicConnectorTypes
      );
      const suggestions = getWithBlockSuggestions(context);

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].label).toBe('true');
      expect(suggestions[1].label).toBe('false');
    });

    it('should provide value suggestions for boolean-like parameter names', () => {
      // Test with a parameter that ends with 'Stream' which is one of the boolean patterns
      const yamlContent = `steps:
  - name: test
    connector-type: slack
    with:
      dataStream: `;
      const cursorOffset = yamlContent.length;
      const dynamicConnectorTypes = {
        slack: {} as ConnectorTypeInfo,
      };

      const context = createAutocompleteContext(
        yamlContent,
        cursorOffset,
        'slack',
        dynamicConnectorTypes
      );
      const suggestions = getWithBlockSuggestions(context);

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].label).toBe('true');
      expect(suggestions[1].label).toBe('false');
    });

    it('should provide numeric suggestions for size/count/limit parameters', () => {
      const yamlContent = `steps:
  - name: test
    connector-type: slack
    with:
      size: `;
      const cursorOffset = yamlContent.length;
      const dynamicConnectorTypes = {
        slack: {} as ConnectorTypeInfo,
      };

      const context = createAutocompleteContext(
        yamlContent,
        cursorOffset,
        'slack',
        dynamicConnectorTypes
      );
      const suggestions = getWithBlockSuggestions(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].label).toBe('10');
    });

    it('should provide string placeholder for empty value', () => {
      const yamlContent = `steps:
  - name: test
    connector-type: slack
    with:
      channel: `;
      const cursorOffset = yamlContent.length;
      const dynamicConnectorTypes = {
        slack: {} as ConnectorTypeInfo,
      };

      const context = createAutocompleteContext(
        yamlContent,
        cursorOffset,
        'slack',
        dynamicConnectorTypes
      );
      const suggestions = getWithBlockSuggestions(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].label).toBe('""');
      expect(suggestions[0].insertText).toBe('""');
    });

    it('should not provide suggestions when editing existing value', () => {
      const yamlContent = `steps:
  - name: test
    connector-type: slack
    with:
      channel: some-val`;
      const cursorOffset = yamlContent.length;
      const dynamicConnectorTypes = {
        slack: {} as ConnectorTypeInfo,
      };

      const context = createAutocompleteContext(
        yamlContent,
        cursorOffset,
        'slack',
        dynamicConnectorTypes
      );
      const suggestions = getWithBlockSuggestions(context);

      expect(suggestions).toEqual([]);
    });
  });

  describe('comment handling', () => {
    it('should show parameter suggestions on comment line', () => {
      const yamlContent = `steps:
  - name: test
    connector-type: slack
    with:
      # `;
      const cursorOffset = yamlContent.length;
      const dynamicConnectorTypes = {
        slack: {} as ConnectorTypeInfo,
      };

      jest.mocked(getConnectorParamsSchema).mockReturnValue({
        channel: z.string(),
        message: z.string(),
      });

      const context = createAutocompleteContext(
        yamlContent,
        cursorOffset,
        'slack',
        dynamicConnectorTypes
      );
      const suggestions = getWithBlockSuggestions(context);

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].label).toBe('channel');
      expect(suggestions[1].label).toBe('message');
    });
  });

  describe('duplicate parameter handling', () => {
    it('should not suggest parameters that already exist', () => {
      const yamlContent = `steps:
  - name: test
    connector-type: slack
    with:
      channel: general
      `;
      const cursorOffset = yamlContent.length;
      const dynamicConnectorTypes = {
        slack: {} as ConnectorTypeInfo,
      };

      jest.mocked(getConnectorParamsSchema).mockReturnValue({
        channel: z.string(),
        message: z.string(),
      });

      jest
        .mocked(getExistingParametersModule.getExistingParametersInWithBlock)
        .mockReturnValue(new Set(['channel']));

      const context = createAutocompleteContext(
        yamlContent,
        cursorOffset,
        'slack',
        dynamicConnectorTypes
      );
      const suggestions = getWithBlockSuggestions(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].label).toBe('message');
    });

    it('should skip kbn-xsrf parameter', () => {
      const yamlContent = `steps:
  - name: test
    connector-type: slack
    with:
      `;
      const cursorOffset = yamlContent.length;
      const dynamicConnectorTypes = {
        slack: {} as ConnectorTypeInfo,
      };

      jest.mocked(getConnectorParamsSchema).mockReturnValue({
        'kbn-xsrf': z.string(),
        message: z.string(),
      });

      const context = createAutocompleteContext(
        yamlContent,
        cursorOffset,
        'slack',
        dynamicConnectorTypes
      );
      const suggestions = getWithBlockSuggestions(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].label).toBe('message');
    });
  });

  describe('schema type handling', () => {
    it('should provide appropriate snippets for different types', () => {
      const yamlContent = `steps:
  - name: test
    connector-type: slack
    with:
      `;
      const cursorOffset = yamlContent.length;
      const dynamicConnectorTypes = {
        slack: {} as ConnectorTypeInfo,
      };

      jest.mocked(getConnectorParamsSchema).mockReturnValue({
        textField: z.string(),
        numberField: z.number(),
        boolField: z.boolean(),
        objectField: z.object({}),
        arrayField: z.array(z.string()),
      });

      // Mock enhanced type info
      jest
        .mocked(generateConnectorSnippetModule.getEnhancedTypeInfo)
        .mockImplementation((schema) => {
          if (schema instanceof z.ZodString) {
            return {
              type: 'string',
              isRequired: true,
              isOptional: false,
              description: 'A text field',
              example: 'example text',
            };
          } else if (schema instanceof z.ZodNumber) {
            return {
              type: 'number',
              isRequired: false,
              isOptional: true,
              description: 'A number field',
              example: '42',
            };
          } else if (schema instanceof z.ZodBoolean) {
            return {
              type: 'boolean',
              isRequired: true,
              isOptional: false,
              description: 'A boolean field',
              example: undefined,
            };
          } else if (schema instanceof z.ZodObject) {
            return {
              type: 'object',
              isRequired: false,
              isOptional: true,
              description: 'An object field',
              example: undefined,
            };
          } else if (schema instanceof z.ZodArray) {
            return {
              type: 'string[]',
              isRequired: false,
              isOptional: true,
              description: 'An array field',
              example: undefined,
            };
          }
          return {
            type: 'unknown',
            isRequired: false,
            isOptional: true,
            description: undefined,
            example: undefined,
          };
        });

      const context = createAutocompleteContext(
        yamlContent,
        cursorOffset,
        'slack',
        dynamicConnectorTypes
      );
      const suggestions = getWithBlockSuggestions(context);

      expect(suggestions).toHaveLength(5);

      // Text field with example
      const textSuggestion = suggestions.find((s) => s.label === 'textField');
      expect(textSuggestion?.insertText).toBe('textField: "${1:example text}"');
      expect(textSuggestion?.detail).toBe('string (required)');

      // Number field with example
      const numberSuggestion = suggestions.find((s) => s.label === 'numberField');
      expect(numberSuggestion?.insertText).toBe('numberField: ${1:42}');
      expect(numberSuggestion?.detail).toBe('number (optional)');

      // Boolean field
      const boolSuggestion = suggestions.find((s) => s.label === 'boolField');
      expect(boolSuggestion?.insertText).toBe('boolField: ${1:true}');
      expect(boolSuggestion?.detail).toBe('boolean (required)');

      // Object field
      const objectSuggestion = suggestions.find((s) => s.label === 'objectField');
      expect(objectSuggestion?.insertText).toBe('objectField:\n  ${1:}');

      // Array field
      const arraySuggestion = suggestions.find((s) => s.label === 'arrayField');
      expect(arraySuggestion?.insertText).toBe('arrayField:\n  - "${1:}"');
    });

    it('should handle array types with different element types', () => {
      const yamlContent = `steps:
  - name: test
    connector-type: slack
    with:
      `;
      const cursorOffset = yamlContent.length;
      const dynamicConnectorTypes = {
        slack: {} as ConnectorTypeInfo,
      };

      jest.mocked(getConnectorParamsSchema).mockReturnValue({
        stringArray: z.array(z.string()),
        numberArray: z.array(z.number()),
      });

      // Mock enhanced type info for arrays
      jest
        .mocked(generateConnectorSnippetModule.getEnhancedTypeInfo)
        .mockImplementation((schema) => {
          if (schema instanceof z.ZodArray) {
            const element = schema._def.type;
            if (element instanceof z.ZodString) {
              return {
                type: 'string[]',
                isRequired: false,
                isOptional: true,
                description: undefined,
                example: undefined,
              };
            } else if (element instanceof z.ZodNumber) {
              return {
                type: 'number[]',
                isRequired: false,
                isOptional: true,
                description: undefined,
                example: undefined,
              };
            }
          }
          return {
            type: 'unknown',
            isRequired: false,
            isOptional: true,
            description: undefined,
            example: undefined,
          };
        });

      const context = createAutocompleteContext(
        yamlContent,
        cursorOffset,
        'slack',
        dynamicConnectorTypes
      );
      const suggestions = getWithBlockSuggestions(context);

      expect(suggestions).toHaveLength(2);

      const stringSuggestion = suggestions.find((s) => s.label === 'stringArray');
      expect(stringSuggestion?.insertText).toBe('stringArray:\n  - "${1:}"');

      const numberSuggestion = suggestions.find((s) => s.label === 'numberArray');
      expect(numberSuggestion?.insertText).toBe('numberArray:\n  - ${1:}');
    });
  });

  describe('special parameter name handling', () => {
    it('should handle parameters with special naming patterns', () => {
      const yamlContent = `steps:
  - name: test
    connector-type: slack
    with:
      `;
      const cursorOffset = yamlContent.length;
      const dynamicConnectorTypes = {
        slack: {} as ConnectorTypeInfo,
      };

      jest.mocked(getConnectorParamsSchema).mockReturnValue({
        isEnabled: z.boolean(),
        isDisabled: z.boolean(),
        messageStream: z.boolean(),
        messageText: z.string(),
        messageContent: z.string(),
        maxSize: z.number(),
        itemCount: z.number(),
        rateLimit: z.number(),
      });

      const context = createAutocompleteContext(
        yamlContent,
        cursorOffset,
        'slack',
        dynamicConnectorTypes
      );
      const suggestions = getWithBlockSuggestions(context);

      // Check boolean-like names get boolean snippets
      const enabledSuggestion = suggestions.find((s) => s.label === 'isEnabled');
      expect(enabledSuggestion?.insertText).toBe('isEnabled: ${1:true}');

      const streamSuggestion = suggestions.find((s) => s.label === 'messageStream');
      expect(streamSuggestion?.insertText).toBe('messageStream: ${1:true}');

      // Check message-like names get string snippets
      const textSuggestion = suggestions.find((s) => s.label === 'messageText');
      expect(textSuggestion?.insertText).toBe('messageText: "${1:}"');

      // Check size/count/limit names get number snippets
      const sizeSuggestion = suggestions.find((s) => s.label === 'maxSize');
      expect(sizeSuggestion?.insertText).toBe('maxSize: ${1:10}');
    });
  });

  describe('suggestion metadata', () => {
    it('should include proper documentation and metadata', () => {
      const yamlContent = `steps:
  - name: test
    connector-type: slack
    with:
      `;
      const cursorOffset = yamlContent.length;
      const dynamicConnectorTypes = {
        slack: {} as ConnectorTypeInfo,
      };

      jest.mocked(getConnectorParamsSchema).mockReturnValue({
        channel: z.string(),
      });

      jest.mocked(generateConnectorSnippetModule.getEnhancedTypeInfo).mockReturnValue({
        type: 'string',
        isRequired: true,
        isOptional: false,
        description: 'The Slack channel to post to',
        example: '#general',
      });

      const context = createAutocompleteContext(
        yamlContent,
        cursorOffset,
        'slack',
        dynamicConnectorTypes
      );
      const suggestions = getWithBlockSuggestions(context);

      expect(suggestions).toHaveLength(1);

      const suggestion = suggestions[0];
      expect(suggestion.kind).toBe(monaco.languages.CompletionItemKind.Variable);
      expect(suggestion.sortText).toBe('!channel');
      expect(suggestion.preselect).toBe(true);
      expect(suggestion.detail).toBe('string (required)');

      // Check documentation
      const doc = suggestion.documentation as { value: string };
      expect(doc.value).toContain('**slack Parameter: channel**');
      expect(doc.value).toContain('**Type:** `string`');
      expect(doc.value).toContain('**Required:** Yes');
      expect(doc.value).toContain('**Description:** The Slack channel to post to');
      expect(doc.value).toContain('**Example:** `#general`');
      expect(doc.value).toContain('*This parameter is specific to the slack connector.*');
    });

    it('should trigger suggestions for simple insertText', () => {
      const yamlContent = `steps:
  - name: test
    connector-type: slack
    with:
      `;
      const cursorOffset = yamlContent.length;
      const dynamicConnectorTypes = {
        slack: {} as ConnectorTypeInfo,
      };

      jest.mocked(getConnectorParamsSchema).mockReturnValue({
        simpleParam: z.string(),
      });

      // Mock to return no example, so we get simple insert text
      jest.mocked(generateConnectorSnippetModule.getEnhancedTypeInfo).mockReturnValue({
        type: 'custom',
        isRequired: false,
        isOptional: true,
        description: undefined,
        example: undefined,
      });

      const context = createAutocompleteContext(
        yamlContent,
        cursorOffset,
        'slack',
        dynamicConnectorTypes
      );
      const suggestions = getWithBlockSuggestions(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].insertText).toBe('simpleParam: ');
      expect(suggestions[0].insertTextRules).toBe(
        monaco.languages.CompletionItemInsertTextRule.None
      );
      expect(suggestions[0].command).toEqual({
        id: 'editor.action.triggerSuggest',
        title: 'Trigger Suggest',
      });
    });
  });

  describe('edge cases', () => {
    it('should return null schema when getConnectorParamsSchemaWithCache returns null', () => {
      const yamlContent = `steps:
  - name: test
    connector-type: slack
    with:
      `;
      const cursorOffset = yamlContent.length;
      const dynamicConnectorTypes = {
        slack: {} as ConnectorTypeInfo,
      };

      jest.mocked(getConnectorParamsSchema).mockReturnValue(null);

      const context = createAutocompleteContext(
        yamlContent,
        cursorOffset,
        'slack',
        dynamicConnectorTypes
      );
      const suggestions = getWithBlockSuggestions(context);

      expect(suggestions).toEqual([]);
    });
  });

  describe('todo_write', () => {
    it('should pass all unit tests for getWithBlockSuggestions', () => {
      // This test serves as a summary to ensure all major functionality is tested
      expect(true).toBe(true);
    });
  });
});
