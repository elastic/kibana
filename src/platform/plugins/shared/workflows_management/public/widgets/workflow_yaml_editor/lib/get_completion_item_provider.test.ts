/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { ConnectorContract } from '@kbn/workflows';
import { generateYamlSchemaFromConnectors } from '@kbn/workflows';
import { getCompletionItemProvider, parseLineForCompletion } from './get_completion_item_provider';
import { z } from '@kbn/zod';

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

function testCompletion(
  completionProvider: monaco.languages.CompletionItemProvider,
  yamlContent: string,
  expectedSuggestions: string[] | ((suggestion: monaco.languages.CompletionItem) => boolean)
) {
  const cursorOffset = yamlContent.indexOf('|<-');
  const mockModel = createMockModel(yamlContent, cursorOffset);
  const position = mockModel.getPositionAt(cursorOffset);
  const triggerCharacter = yamlContent.slice(cursorOffset - 1, cursorOffset);

  const result = completionProvider.provideCompletionItems(
    mockModel as any,
    position as any,
    {
      triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
      triggerCharacter,
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
  // checking for sorted arrays to avoid flakiness, since the order of suggestions is not guaranteed
  if (typeof expectedSuggestions === 'function') {
    for (const suggestion of completionList?.suggestions || []) {
      if (!expectedSuggestions(suggestion)) {
        throw new Error(
          `Suggestion ${suggestion.label} does not match expected function: ${JSON.stringify(
            suggestion
          )}`
        );
      }
    }
  } else {
    expect(labels.sort()).toEqual(expectedSuggestions.sort());
  }
}

describe('getCompletionItemProvider', () => {
  const mockConnectors: ConnectorContract[] = [
    {
      type: 'console.log',
      paramsSchema: z.object({
        message: z.string(),
      }),
      outputSchema: z.object({
        message: z.string(),
      }),
    },
  ];

  const workflowSchema = generateYamlSchemaFromConnectors(mockConnectors, true);
  const completionProvider = getCompletionItemProvider(workflowSchema);

  describe('Integration tests', () => {
    it('should provide basic completions inside variable expression', () => {
      const yamlContent = `
version: "1"
name: "test"
consts:
  apiUrl: "https://api.example.com"
steps:
  - name: step1
    type: console.log
    with:
      message: "{{|<-}}"
`.trim();

      testCompletion(completionProvider, yamlContent, [
        'consts',
        'event',
        'now',
        'workflow',
        'steps',
        'execution',
        'inputs',
      ]);
    });

    it('should provide completions after @ and quote insertText automatically if cursor is in plain scalar', () => {
      const yamlContent = `
version: "1"
name: "test"
consts:
  apiUrl: "https://api.example.com"
steps:
  - name: step1
    type: console.log
    with:
      message: @|<-
`.trim();
      testCompletion(completionProvider, yamlContent, (suggestion) => {
        return suggestion.insertText.startsWith('"') && suggestion.insertText.endsWith('"');
      });
    });

    it('should provide completions after @ and not quote insertText automatically if cursor is in plain scalar but not starting with { or @', () => {
      const yamlContent = `
version: "1"
name: "test"
consts:
  apiUrl: "https://api.example.com"
steps:
  - name: step1
    type: console.log
    with:
      message: hey, this is @|<-
`.trim();
      testCompletion(completionProvider, yamlContent, (suggestion) => {
        return !suggestion.insertText.startsWith('"') && !suggestion.insertText.endsWith('"');
      });
    });

    it('should provide basic completions with @ and not quote insertText automatically if cursor is in string', () => {
      const yamlContent = `
version: "1"
name: "test"
consts:
  apiUrl: "https://api.example.com"
steps:
  - name: step1
    type: console.log
    with:
      message: "@<-"
`.trim();

      testCompletion(completionProvider, yamlContent, [
        'consts',
        'event',
        'now',
        'workflow',
        'steps',
        'execution',
        'inputs',
      ]);
      testCompletion(completionProvider, yamlContent, (suggestion) => {
        return !suggestion.insertText.startsWith('"') && !suggestion.insertText.endsWith('"');
      });
    });

    it('should provide const completion with type', () => {
      const yamlContent = `
version: "1"
name: "test"
consts:
  apiUrl: "https://api.example.com"
  threshold: 100
  templates:
    - name: template1
      template:
        subject: 'Suspicious activity detected'
        body: 'Go look at the activity'
steps:
  - name: step1
    type: console.log
    with:
      message: "{{consts.|<-}}"
`.trim();

      testCompletion(completionProvider, yamlContent, (suggestion) => {
        if (suggestion.label === 'apiUrl') {
          return suggestion.detail!.startsWith('string');
        }
        if (suggestion.label === 'threshold') {
          return suggestion.detail!.startsWith('number');
        }
        if (suggestion.label === 'templates') {
          return suggestion.detail!.startsWith('array');
        }
        return false;
      });
    });

    it('should provide const completion with type in array', () => {
      const yamlContent = `
version: "1"
name: "test"
consts:
  apiUrl: "https://api.example.com"
  threshold: 100
  templates:
    - name: template1
      template:
        subject: 'Suspicious activity detected'
        body: 'Go look at the activity'
steps:
  - name: step1
    type: console.log
    with:
      message: "{{consts.templates[0].|<-}}"
`.trim();

      testCompletion(completionProvider, yamlContent, (suggestion) => {
        if (suggestion.label === 'name') {
          return suggestion.detail!.startsWith('string');
        }
        if (suggestion.label === 'template') {
          return suggestion.detail!.startsWith('object');
        }
        return false;
      });
    });

    it('should provide previous step completion', () => {
      const yamlContent = `
version: "1"
name: "test"
consts:
  apiUrl: "https://api.example.com"
steps:
  - name: step0
    type: console.log
    with:
      message: "hello"
  - name: step1
    type: console.log
    with:
      message: "{{steps.|<-}}"
`.trim();

      testCompletion(completionProvider, yamlContent, ['step0']);
    });

    it('should not provide unreachable step', () => {
      const yamlContent = `
version: "1"
name: "test"
consts:
  apiUrl: "https://api.example.com"
steps:
  - name: if-step
    type: if
    with:
      condition: "{{steps.step0.output.message == 'hello'}}"
    steps:
      - name: first-true-step
        type: console.log
        with:
          message: "im true"
      - name: second-true-step
        type: console.log
        with:
          message: "im true, {{steps.|<-}}"
    else:
      - name: false-step
        type: console.log
        with:
          message: "im unreachable"
`.trim();

      testCompletion(completionProvider, yamlContent, ['if-step', 'first-true-step']);
    });

    it('should autocomplete incomplete key', () => {
      const yamlContent = `
version: "1"
name: "test"
consts:
  apiUrl: "https://api.example.com"
steps:
  - name: step0
    type: console.log
    with:
      message: "{{consts.a|<-}}"
`.trim();

      testCompletion(completionProvider, yamlContent, ['apiUrl']);
    });

    it('should provide completions with brackets for keys in kebab-case and use quote type opposite to the one in the string', () => {
      const yamlContentDoubleQuote = `
version: "1"
name: "test"
consts:
  api-url: "https://api.example.com"
steps:
  - name: step0
    type: console.log
    with:
      message: "{{consts.|<-}}"
`.trim();
      testCompletion(completionProvider, yamlContentDoubleQuote, (suggestion) => {
        return suggestion.insertText === "['api-url']";
      });

      const yamlContentSingleQuote = `
      version: "1"
      name: "test"
      consts:
        api-url: "https://api.example.com"
      steps:
        - name: step0
          type: console.log
          with:
            message: '{{consts.|<-}}'
      `.trim();
      testCompletion(completionProvider, yamlContentSingleQuote, (suggestion) => {
        return suggestion.insertText === '["api-url"]';
      });
    });
  });

  describe('parseLineForCompletion', () => {
    describe('@ trigger scenarios', () => {
      it('should parse @ trigger without key', () => {
        const result = parseLineForCompletion('message: "@');
        expect(result.matchType).toBe('at');
        expect(result.fullKey).toBe('');
      });

      it('should parse @ trigger with simple key', () => {
        const result = parseLineForCompletion('message: "@consts');
        expect(result.matchType).toBe('at');
        expect(result.fullKey).toBe('consts');
      });

      it('should parse @ trigger with dotted path', () => {
        const result = parseLineForCompletion('message: "@steps.step1');
        expect(result.matchType).toBe('at');
        expect(result.fullKey).toBe('steps.step1');
      });

      it('should parse @ trigger with trailing dot', () => {
        const result = parseLineForCompletion('message: "@consts.');
        expect(result.matchType).toBe('at');
        expect(result.fullKey).toBe('consts');
      });
    });

    describe('mustache unfinished scenarios', () => {
      it('should parse unfinished mustache at end of line', () => {
        const result = parseLineForCompletion('message: "{{ consts');
        expect(result.matchType).toBe('variable-unfinished');
        expect(result.fullKey).toBe('consts');
      });

      it('should parse unfinished mustache with dotted path', () => {
        const result = parseLineForCompletion('url: "{{ consts.api');
        expect(result.matchType).toBe('variable-unfinished');
        expect(result.fullKey).toBe('consts.api');
      });

      it('should parse unfinished mustache with trailing dot', () => {
        const result = parseLineForCompletion('value: {{ steps.');
        expect(result.matchType).toBe('variable-unfinished');
        expect(result.fullKey).toBe('steps');
      });
    });

    describe('complete mustache scenarios', () => {
      it('should parse complete mustache expression', () => {
        const result = parseLineForCompletion('message: "{{ consts.apiUrl }} - more text');
        expect(result.matchType).toBe('variable-complete');
        expect(result.fullKey).toBe('consts.apiUrl');
      });

      it('should parse last complete mustache when multiple present', () => {
        const result = parseLineForCompletion('url: {{ consts.baseUrl }}/users/{{ steps.getUser');
        expect(result.matchType).toBe('variable-unfinished');
        expect(result.fullKey).toBe('steps.getUser');
      });

      it('should parse complex nested path', () => {
        const result = parseLineForCompletion('data: {{ steps.fetchData.output.results.items }}');
        expect(result.matchType).toBe('variable-complete');
        expect(result.fullKey).toBe('steps.fetchData.output.results.items');
      });
    });

    describe('priority handling', () => {
      it('should prioritize @ trigger over mustache', () => {
        const result = parseLineForCompletion('{{ consts.old }} @steps');
        expect(result.matchType).toBe('at');
        expect(result.fullKey).toBe('steps');
      });

      it('should prioritize unfinished over complete mustache', () => {
        const result = parseLineForCompletion('{{ consts.apiUrl }} and {{ steps.step1');
        expect(result.matchType).toBe('variable-unfinished');
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

      it('should return null for incomplete brackets', () => {
        const result = parseLineForCompletion('message: "{ consts.api }');
        expect(result.matchType).toBeNull();
        expect(result.fullKey).toBe('');
      });
    });

    describe('edge cases', () => {
      it('should parse special dot in mustache', () => {
        const result = parseLineForCompletion('message: "{{ . }}');
        expect(result.matchType).toBe('variable-complete');
        expect(result.fullKey).toBe('.');
      });

      it('should handle whitespace in mustache expressions', () => {
        const result = parseLineForCompletion('message: "{{  consts.apiUrl  }} other');
        expect(result.matchType).toBe('variable-complete');
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
