/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Scalar } from 'yaml';
import { monaco } from '@kbn/monaco';
import { wrapAsMonacoSuggestion } from './wrap_as_monaco_suggestion';

const createMockRange = (
  startLine = 1,
  startCol = 10,
  endLine = 1,
  endCol = 15
): monaco.IRange => ({
  startLineNumber: startLine,
  endLineNumber: endLine,
  startColumn: startCol,
  endColumn: endCol,
});

describe('wrapAsMonacoSuggestion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic behavior', () => {
    it('should create a completion item with correct label and kind', () => {
      const range = createMockRange();
      const result = wrapAsMonacoSuggestion('myVariable', '.', range, null, false, 'string');

      expect(result.label).toBe('myVariable');
      expect(result.kind).toBe(monaco.languages.CompletionItemKind.Field);
      expect(result.range).toBe(range);
    });

    it('should include type in the detail', () => {
      const range = createMockRange();
      const result = wrapAsMonacoSuggestion('count', '.', range, null, false, 'number');

      expect(result.detail).toBe('number');
    });

    it('should include description in the detail when provided', () => {
      const range = createMockRange();
      const result = wrapAsMonacoSuggestion(
        'apiKey',
        '.',
        range,
        null,
        false,
        'string',
        'The API key for authentication'
      );

      expect(result.detail).toBe('string: The API key for authentication');
    });
  });

  describe('dot trigger character (property access)', () => {
    it('should insert the key directly for valid property paths', () => {
      const range = createMockRange();
      const result = wrapAsMonacoSuggestion('myProp', '.', range, null, false, 'string');

      expect(result.insertText).toBe('myProp');
      expect(result.additionalTextEdits).toEqual([]);
    });

    it('should use bracket notation for keys with special characters', () => {
      const range = createMockRange();
      const result = wrapAsMonacoSuggestion('my-prop', '.', range, null, false, 'string');

      // Should use bracket notation with quotes
      expect(result.insertText).toMatch(/^\[["']my-prop["']\]$/);
      // Should include a text edit to remove the dot
      expect(result.additionalTextEdits).toHaveLength(1);
    });

    it('should use double quotes in bracket notation when scalar type is QUOTE_DOUBLE', () => {
      const range = createMockRange();
      const result = wrapAsMonacoSuggestion(
        'my-prop',
        '.',
        range,
        Scalar.QUOTE_DOUBLE,
        false,
        'string'
      );

      // Should use single quotes as opposite quote type
      expect(result.insertText).toBe("['my-prop']");
    });

    it('should use double quotes in bracket notation for non-QUOTE_DOUBLE scalar', () => {
      const range = createMockRange();
      const result = wrapAsMonacoSuggestion(
        'my-prop',
        '.',
        range,
        Scalar.QUOTE_SINGLE,
        false,
        'string'
      );

      expect(result.insertText).toBe('["my-prop"]');
    });
  });

  describe('@ trigger character', () => {
    it('should wrap with curly braces when useCurlyBraces is true (default)', () => {
      const range = createMockRange();
      const result = wrapAsMonacoSuggestion('inputs.name', '@', range, null, false, 'string');

      expect(result.insertText).toBe('{{ inputs.name$0 }}');
      expect(result.insertTextRules).toBe(
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      );
    });

    it('should not wrap with curly braces when useCurlyBraces is false', () => {
      const range = createMockRange();
      const result = wrapAsMonacoSuggestion(
        'inputs.name',
        '@',
        range,
        null,
        false,
        'string',
        undefined,
        false
      );

      expect(result.insertText).toBe('inputs.name');
      expect(result.insertTextRules).toBe(monaco.languages.CompletionItemInsertTextRule.None);
    });

    it('should include additional text edit to remove @ character', () => {
      const range = createMockRange(1, 10, 1, 15);
      const result = wrapAsMonacoSuggestion('steps.output', '@', range, null, false, 'object');

      expect(result.additionalTextEdits).toHaveLength(1);
      expect(result.additionalTextEdits?.[0].text).toBe('');
      expect(result.additionalTextEdits?.[0].range.startColumn).toBe(range.startColumn - 1);
    });

    it('should use bracket notation for non-path-safe keys inside braces', () => {
      const range = createMockRange();
      const result = wrapAsMonacoSuggestion(
        'my special key',
        '@',
        range,
        null,
        false,
        'string',
        undefined,
        false
      );

      // Should use bracket notation since key has spaces
      expect(result.insertText).toMatch(/\[["']my special key["']\]/);
    });
  });

  describe('shouldBeQuoted', () => {
    it('should wrap insertText in double quotes when shouldBeQuoted is true', () => {
      const range = createMockRange();
      const result = wrapAsMonacoSuggestion('myVar', '.', range, null, true, 'string');

      expect(result.insertText).toBe('"myVar"');
    });

    it('should wrap @-triggered text in double quotes when shouldBeQuoted is true', () => {
      const range = createMockRange();
      const result = wrapAsMonacoSuggestion('inputs.val', '@', range, null, true, 'string');

      expect(result.insertText).toBe('"{{ inputs.val$0 }}"');
    });
  });

  describe('null trigger character', () => {
    it('should handle null trigger character like a dot', () => {
      const range = createMockRange();
      const result = wrapAsMonacoSuggestion('myProp', null, range, null, false, 'string');

      expect(result.insertText).toBe('myProp');
    });
  });

  describe('insertTextRules', () => {
    it('should use None for non-@ triggers', () => {
      const range = createMockRange();
      const result = wrapAsMonacoSuggestion('myProp', '.', range, null, false, 'string');

      expect(result.insertTextRules).toBe(monaco.languages.CompletionItemInsertTextRule.None);
    });

    it('should use InsertAsSnippet for @ trigger with curly braces', () => {
      const range = createMockRange();
      const result = wrapAsMonacoSuggestion(
        'inputs.val',
        '@',
        range,
        null,
        false,
        'string',
        undefined,
        true
      );

      expect(result.insertTextRules).toBe(
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      );
    });

    it('should use None for @ trigger without curly braces', () => {
      const range = createMockRange();
      const result = wrapAsMonacoSuggestion(
        'inputs.val',
        '@',
        range,
        null,
        false,
        'string',
        undefined,
        false
      );

      expect(result.insertTextRules).toBe(monaco.languages.CompletionItemInsertTextRule.None);
    });
  });

  describe('additionalTextEdits for removing dot/@ character', () => {
    it('should not add text edits for dot-triggered path-safe keys', () => {
      const range = createMockRange();
      const result = wrapAsMonacoSuggestion('validKey', '.', range, null, false, 'string');

      expect(result.additionalTextEdits).toEqual([]);
    });

    it('should add text edit for @ trigger to remove the @ character', () => {
      const range = createMockRange(2, 20, 2, 25);
      const result = wrapAsMonacoSuggestion('steps.output', '@', range, null, false, 'object');

      expect(result.additionalTextEdits).toHaveLength(1);
      const edit = result.additionalTextEdits?.[0];
      expect(edit?.range.startColumn).toBe(19); // startColumn - 1
      expect(edit?.range.endColumn).toBe(25); // same as range.endColumn
      expect(edit?.text).toBe('');
    });

    it('should add text edit for non-path-safe keys with dot trigger', () => {
      const range = createMockRange(1, 10, 1, 15);
      const result = wrapAsMonacoSuggestion('key with spaces', '.', range, null, false, 'string');

      // Non-path-safe keys need dot removed
      expect(result.additionalTextEdits).toHaveLength(1);
    });
  });
});
