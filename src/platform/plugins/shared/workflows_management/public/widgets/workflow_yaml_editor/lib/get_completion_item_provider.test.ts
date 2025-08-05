/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { ConnectorContract, generateYamlSchemaFromConnectors } from '@kbn/workflows';
import { getCompletionItemProvider, parseLineForCompletion } from './get_completion_item_provider';

// Mock Monaco editor model
const createMockModel = (value: string, cursorOffset: number) => {
  const lines = value.split('\n');
  let position = { lineNumber: 1, column: 1 };

  // Calculate line and column from offset
  let currentOffset = 0;
  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1; // +1 for newline
    if (currentOffset + lineLength > cursorOffset) {
      position = {
        lineNumber: i + 1,
        column: cursorOffset - currentOffset + 1,
      };
      break;
    }
    currentOffset += lineLength;
  }

  return {
    getValue: () => value,
    getLineContent: (lineNumber: number) => lines[lineNumber - 1] || '',
    getWordUntilPosition: (pos: typeof position) => ({
      word: '',
      startColumn: pos.column,
      endColumn: pos.column,
    }),
    getWordAtPosition: (pos: typeof position) => ({
      word: '',
      startColumn: pos.column,
      endColumn: pos.column,
    }),
    getOffsetAt: (pos: typeof position) => cursorOffset,
    getPositionAt: (offset: number) => position,
  };
};

describe('getCompletionItemProvider', () => {
  const mockConnectors: ConnectorContract[] = [
    {
      type: 'console.log',
      params: [
        {
          name: 'message',
          type: 'string',
        },
      ],
    },
  ];

  const workflowSchema = generateYamlSchemaFromConnectors(mockConnectors, true);
  const completionProvider = getCompletionItemProvider(workflowSchema);

  describe('Integration tests', () => {
    it('should provide basic completions', () => {
      const yamlContent = `
version: "1"
workflow:
  name: "test"
  consts:
    apiUrl: "https://api.example.com"
  steps:
    - name: "step1"
      type: "console.log"  
      with:
        message: "{{ }}"
`.trim();

      // Position cursor inside the mustache template
      const cursorOffset = yamlContent.indexOf('{{ }}') + 3;
      const mockModel = createMockModel(yamlContent, cursorOffset);
      const position = mockModel.getPositionAt(cursorOffset);

      const result = completionProvider.provideCompletionItems(
        mockModel as any,
        position as any,
        {
          triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
          triggerCharacter: '{',
        } as any,
        {} as any // cancellation token
      );

      // Handle both sync and async returns
      const completionList = result as monaco.languages.CompletionList;
      expect(completionList?.suggestions).toBeDefined();
      expect(completionList?.suggestions.length).toBeGreaterThan(0);

      // Should include basic context items
      const labels =
        completionList?.suggestions.map((s: monaco.languages.CompletionItem) => s.label) || [];
      expect(labels).toContain('consts');
      expect(labels).toContain('steps');
    });
  });

  describe('parseLineForCompletion', () => {
    describe('@ trigger scenarios', () => {
      it('should parse @ trigger without key', () => {
        const result = parseLineForCompletion('message: "@');
        expect(result.matchType).toBe('at-trigger');
        expect(result.fullKey).toBe('');
      });

      it('should parse @ trigger with simple key', () => {
        const result = parseLineForCompletion('message: "@consts');
        expect(result.matchType).toBe('at-trigger');
        expect(result.fullKey).toBe('consts');
      });

      it('should parse @ trigger with dotted path', () => {
        const result = parseLineForCompletion('message: "@steps.step1');
        expect(result.matchType).toBe('at-trigger');
        expect(result.fullKey).toBe('steps.step1');
      });

      it('should parse @ trigger with trailing dot', () => {
        const result = parseLineForCompletion('message: "@consts.');
        expect(result.matchType).toBe('at-trigger');
        expect(result.fullKey).toBe('consts');
      });
    });

    describe('mustache unfinished scenarios', () => {
      it('should parse unfinished mustache at end of line', () => {
        const result = parseLineForCompletion('message: "{{ consts');
        expect(result.matchType).toBe('mustache-unfinished');
        expect(result.fullKey).toBe('consts');
      });

      it('should parse unfinished mustache with dotted path', () => {
        const result = parseLineForCompletion('url: "{{ consts.api');
        expect(result.matchType).toBe('mustache-unfinished');
        expect(result.fullKey).toBe('consts.api');
      });

      it('should parse unfinished mustache with trailing dot', () => {
        const result = parseLineForCompletion('value: {{ steps.');
        expect(result.matchType).toBe('mustache-unfinished');
        expect(result.fullKey).toBe('steps');
      });
    });

    describe('complete mustache scenarios', () => {
      it('should parse complete mustache expression', () => {
        const result = parseLineForCompletion('message: "{{ consts.apiUrl }} - more text');
        expect(result.matchType).toBe('mustache-complete');
        expect(result.fullKey).toBe('consts.apiUrl');
      });

      it('should parse last complete mustache when multiple present', () => {
        const result = parseLineForCompletion('url: {{ consts.baseUrl }}/users/{{ steps.getUser');
        expect(result.matchType).toBe('mustache-unfinished');
        expect(result.fullKey).toBe('steps.getUser');
      });

      it('should parse complex nested path', () => {
        const result = parseLineForCompletion('data: {{ steps.fetchData.output.results.items }}');
        expect(result.matchType).toBe('mustache-complete');
        expect(result.fullKey).toBe('steps.fetchData.output.results.items');
      });
    });

    describe('priority handling', () => {
      it('should prioritize @ trigger over mustache', () => {
        const result = parseLineForCompletion('{{ consts.old }} @steps');
        expect(result.matchType).toBe('at-trigger');
        expect(result.fullKey).toBe('steps');
      });

      it('should prioritize unfinished over complete mustache', () => {
        const result = parseLineForCompletion('{{ consts.apiUrl }} and {{ steps.step1');
        expect(result.matchType).toBe('mustache-unfinished');
        expect(result.fullKey).toBe('steps.step1');
      });
    });

    describe('no match scenarios', () => {
      it('should return null for plain text', () => {
        const result = parseLineForCompletion('message: "hello world"');
        expect(result.matchType).toBeNull();
        expect(result.fullKey).toBe('');
        expect(result.match).toBeNull();
      });

      it('should return null for incomplete braces', () => {
        const result = parseLineForCompletion('message: "{ consts.api }');
        expect(result.matchType).toBeNull();
        expect(result.fullKey).toBe('');
      });
    });

    describe('edge cases', () => {
      it('should parse special dot in mustache', () => {
        const result = parseLineForCompletion('message: "{{ . }}');
        expect(result.matchType).toBe('mustache-complete');
        expect(result.fullKey).toBe('.');
      });

      it('should handle whitespace in mustache expressions', () => {
        const result = parseLineForCompletion('message: "{{  consts.apiUrl  }} other');
        expect(result.matchType).toBe('mustache-complete');
        expect(result.fullKey).toBe('consts.apiUrl');
      });

      it('should handle empty line', () => {
        const result = parseLineForCompletion('');
        expect(result.matchType).toBeNull();
        expect(result.fullKey).toBe('');
      });

      it('should handle line with only spaces', () => {
        const result = parseLineForCompletion('    ');
        expect(result.matchType).toBeNull();
        expect(result.fullKey).toBe('');
      });
    });
  });
});
