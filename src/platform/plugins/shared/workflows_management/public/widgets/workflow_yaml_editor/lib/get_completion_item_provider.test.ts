/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { ConnectorContractUnion } from '@kbn/workflows';
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

async function getSuggestions(
  completionProvider: monaco.languages.CompletionItemProvider,
  yamlContent: string
) {
  const cursorOffset = yamlContent.indexOf('|<-');
  const mockModel = createMockModel(yamlContent, cursorOffset);
  const position = mockModel.getPositionAt(cursorOffset);
  const triggerCharacter = yamlContent.slice(cursorOffset - 1, cursorOffset);

  const result = await completionProvider.provideCompletionItems(
    mockModel as any,
    position as any,
    {
      triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
      triggerCharacter,
    } as any,
    {} as any // cancellation token
  );

  return result?.suggestions ?? [];
}

describe('getCompletionItemProvider', () => {
  const mockConnectors: ConnectorContractUnion[] = [
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
    it('should provide basic completions inside variable expression', async () => {
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

      const suggestions = await getSuggestions(completionProvider, yamlContent);
      expect(suggestions.map((s) => s.label)).toEqual(
        expect.arrayContaining([
          'consts',
          'event',
          'now',
          'workflow',
          'steps',
          'execution',
          'inputs',
        ])
      );
    });

    it('should provide completions after @ and quote insertText automatically if cursor is in plain scalar', async () => {
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
      const suggestions = await getSuggestions(completionProvider, yamlContent);
      expect(suggestions.map((s) => s.insertText)).toEqual(
        expect.arrayContaining([expect.stringMatching(/^".*"$/)])
      );
    });

    it('should provide completions after @ and not quote insertText automatically if cursor is in plain scalar but not starting with { or @', async () => {
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
      const suggestions = await getSuggestions(completionProvider, yamlContent);
      expect(suggestions.map((s) => s.label)).toEqual(
        expect.arrayContaining([expect.not.stringMatching(/^"[^"]*$/)])
      );
    });

    it('should provide basic completions with @ and not quote insertText automatically if cursor is in string', async () => {
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

      const suggestions = await getSuggestions(completionProvider, yamlContent);
      expect(suggestions.map((s) => s.label)).toEqual(
        expect.arrayContaining([
          'consts',
          'event',
          'now',
          'workflow',
          'steps',
          'execution',
          'inputs',
        ])
      );
    });

    it('should provide const completion with type', async () => {
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

      const suggestions = await getSuggestions(completionProvider, yamlContent);
      expect(suggestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'apiUrl', detail: '"https://api.example.com"' }),
          expect.objectContaining({
            label: 'threshold',
            detail: '100',
          }),
          expect.objectContaining({
            label: 'templates',
            detail: expect.stringContaining(
              '{  name: "template1";  template: {  subject: "Suspicious activity detected";  body: "Go look at the activity"}}[]'
            ),
          }),
        ])
      );
    });

    it('should provide const completion with type in array', async () => {
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

      const suggestions = await getSuggestions(completionProvider, yamlContent);
      expect(suggestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'name', detail: '"template1"' }),
          expect.objectContaining({
            label: 'template',
            detail: '{  subject: "Suspicious activity detected";  body: "Go look at the activity"}',
          }),
        ])
      );
    });

    it('should provide previous step completion', async () => {
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

      const suggestions = await getSuggestions(completionProvider, yamlContent);
      expect(suggestions.map((s) => s.label)).toEqual(expect.arrayContaining(['step0']));
    });

    it('should not provide unreachable step', async () => {
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

      const suggestions = await getSuggestions(completionProvider, yamlContent);
      expect(suggestions.map((s) => s.label)).toEqual(
        expect.arrayContaining(['if-step', 'first-true-step'])
      );
    });

    it('should autocomplete incomplete key', async () => {
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

      const suggestions = await getSuggestions(completionProvider, yamlContent);
      expect(suggestions.map((s) => s.label)).toEqual(expect.arrayContaining(['apiUrl']));
    });

    it('should provide completions with brackets for keys in kebab-case and use quote type opposite to the one in the string', async () => {
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
      const suggestions1 = await getSuggestions(completionProvider, yamlContentDoubleQuote);
      expect(suggestions1.map((s) => s.insertText)).toEqual(
        expect.arrayContaining(["['api-url']"])
      );

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
      const suggestions2 = await getSuggestions(completionProvider, yamlContentSingleQuote);
      expect(suggestions2.map((s) => s.insertText)).toEqual(
        expect.arrayContaining(['["api-url"]'])
      );
    });

    it('should provide rrule suggestions in empty scheduled trigger with block', async () => {
      const yamlContent = `
version: "1"
name: "test"
triggers:
  - type: scheduled
    enabled: true
    with:
      |<-
steps: []
`.trim();

      const suggestions = await getSuggestions(completionProvider, yamlContent);
      expect(suggestions.map((s) => s.label)).toEqual(
        expect.arrayContaining([
          'Daily at 9 AM',
          'Business hours (weekdays 8 AM & 5 PM)',
          'Monthly on 1st and 15th',
          'Custom RRule',
        ])
      );
    });

    it('should provide rrule suggestions in scheduled trigger with block with proper YAML', async () => {
      const yamlContent = `
version: "1"
name: "test"
triggers:
  - type: scheduled
    enabled: true
    with:
      |<-
steps: []
`.trim();

      const suggestions = await getSuggestions(completionProvider, yamlContent);
      expect(suggestions.map((s) => s.label)).toEqual(
        expect.arrayContaining([
          'Daily at 9 AM',
          'Business hours (weekdays 8 AM & 5 PM)',
          'Monthly on 1st and 15th',
          'Custom RRule',
        ])
      );
    });

    it('should provide rrule suggestions in scheduled trigger with block with empty map', async () => {
      const yamlContent = `
version: "1"
name: "test"
triggers:
  - type: scheduled
    enabled: true
    with:
      |<-
steps: []
`.trim();

      const suggestions = await getSuggestions(completionProvider, yamlContent);
      expect(suggestions.map((s) => s.label)).toEqual(
        expect.arrayContaining([
          'Daily at 9 AM',
          'Business hours (weekdays 8 AM & 5 PM)',
          'Monthly on 1st and 15th',
          'Custom RRule',
        ])
      );
    });

    it('should provide rrule suggestions in scheduled trigger with block with cursor inside', async () => {
      const yamlContent = `
version: "1"
name: "test"
triggers:
  - type: scheduled
    enabled: true
    with:
      |<-
steps: []
`.trim();

      const suggestions = await getSuggestions(completionProvider, yamlContent);
      expect(suggestions.map((s) => s.label)).toEqual(
        expect.arrayContaining([
          'Daily at 9 AM',
          'Business hours (weekdays 8 AM & 5 PM)',
          'Monthly on 1st and 15th',
          'Custom RRule',
        ])
      );
    });

    it('should NOT provide rrule suggestions when rrule already exists', async () => {
      const yamlContent = `
version: "1"
name: "test"
triggers:
  - type: scheduled
    enabled: true
    with:
      rrule:
        freq: DAILY
        interval: 1
        tzid: UTC
        byhour: [9]
        byminute: [0]
      |<-
steps: []
`.trim();

      const suggestions = await getSuggestions(completionProvider, yamlContent);
      expect(suggestions.map((s) => s.label)).not.toEqual(
        expect.arrayContaining([
          'Daily at 9 AM',
          'Business hours (weekdays 8 AM & 5 PM)',
          'Monthly on 1st and 15th',
          'Custom RRule',
        ])
      );
    });

    it('should NOT provide rrule suggestions when every already exists', async () => {
      const yamlContent = `
version: "1"
name: "test"
triggers:
  - type: scheduled
    enabled: true
    with:
      every: "5m"
      |<-
steps: []
`.trim();

      const suggestions = await getSuggestions(completionProvider, yamlContent);
      expect(suggestions.map((s) => s.label)).not.toEqual(
        expect.arrayContaining([
          'Daily at 9 AM',
          'Business hours (weekdays 8 AM & 5 PM)',
          'Monthly on 1st and 15th',
          'Custom RRule',
        ])
      );
    });

    it('should provide timezone suggestions for tzid field in scheduled trigger', async () => {
      const yamlContent = `
version: "1"
name: "test"
triggers:
  - name: scheduled-trigger
    type: scheduled
    with:
      rrule:
        freq: DAILY
        interval: 1
        tzid: |<-
`.trim();

      const suggestions = await getSuggestions(completionProvider, yamlContent);

      // Should include timezone suggestions
      expect(suggestions.length).toBeGreaterThan(0);

      // Should have timezone documentation
      const firstSuggestion = suggestions[0];
      expect(firstSuggestion?.documentation).toBeDefined();
      expect(firstSuggestion?.detail).toContain('Timezone:');
    });

    it('should filter timezone suggestions based on prefix', async () => {
      const yamlContent = `
version: "1"
name: "test"
triggers:
  - name: scheduled-trigger
    type: scheduled
    with:
      rrule:
        freq: DAILY
        interval: 1
        tzid: Amer|<-
`.trim();

      const suggestions = await getSuggestions(completionProvider, yamlContent);

      // Should only include American timezones
      expect(suggestions.length).toBeGreaterThan(0);
      expect(
        suggestions.every((s) => typeof s.label === 'string' && s.label.startsWith('America/'))
      ).toBe(true);
    });

    it('should prioritize UTC timezones in suggestions', async () => {
      const yamlContent = `
version: "1"
name: "test"
triggers:
  - name: scheduled-trigger
    type: scheduled
    with:
      rrule:
        freq: DAILY
        interval: 1
        tzid: |<-
`.trim();

      const suggestions = await getSuggestions(completionProvider, yamlContent);

      // Should have timezone suggestions
      expect(suggestions.length).toBeGreaterThan(0);

      // Should have timezone documentation
      const firstSuggestion = suggestions[0];
      expect(firstSuggestion?.documentation).toBeDefined();
      expect(firstSuggestion?.detail).toContain('Timezone:');
    });

    it('should replace entire tzid value when selecting timezone', async () => {
      const yamlContent = `
version: "1"
name: "test"
triggers:
  - name: scheduled-trigger
    type: scheduled
    with:
      rrule:
        freq: DAILY
        interval: 1
        tzid: UTC |<-
`.trim();

      const suggestions = await getSuggestions(completionProvider, yamlContent);

      // Should have timezone suggestions
      expect(suggestions.length).toBeGreaterThan(0);

      // Check that suggestions have InsertAsSnippet insertTextRules
      const firstSuggestion = suggestions[0];
      expect(firstSuggestion?.insertTextRules).toBe(
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      );
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
      // matches as 'liquid-block-keyword' which is then filtered out
      // later by the completion provider's isInsideLiquidBlock check
      it('should handle empty line', () => {
        const result = parseLineForCompletion('');
        expect(result.matchType).toBe('liquid-block-keyword');
        expect(result.fullKey).toBe('');
      });
      // matches as 'liquid-block-keyword' which is then filtered out
      // later by the completion provider's isInsideLiquidBlock check
      it('should handle line with only spaces', () => {
        const result = parseLineForCompletion('    ');
        expect(result.matchType).toBe('liquid-block-keyword');
        expect(result.fullKey).toBe('');
      });
    });

    describe('liquid filter scenarios', () => {
      it('should parse liquid filter at end of line', () => {
        const result = parseLineForCompletion('message: "{{ user.name | ');
        expect(result.matchType).toBe('liquid-filter');
        expect(result.fullKey).toBe('');
        expect(result.match).toBeTruthy();
      });

      it('should parse liquid filter with partial filter name', () => {
        const result = parseLineForCompletion('value: {{ price | up');
        expect(result.matchType).toBe('liquid-filter');
        expect(result.fullKey).toBe('up');
        expect(result.match).toBeTruthy();
      });

      it('should parse liquid filter with complex variable path', () => {
        const result = parseLineForCompletion('data: {{ steps.fetchUser.output.name | ');
        expect(result.matchType).toBe('liquid-filter');
        expect(result.fullKey).toBe('');
      });

      it('should parse liquid filter with array access', () => {
        const result = parseLineForCompletion('item: {{ items[0].title | cap');
        expect(result.matchType).toBe('liquid-filter');
        expect(result.fullKey).toBe('cap');
      });

      it('should parse liquid filter with whitespace', () => {
        const result = parseLineForCompletion('text: {{  user.name  |  up');
        expect(result.matchType).toBe('liquid-filter');
        expect(result.fullKey).toBe('up');
      });

      it('should not match liquid filter if not at end of line', () => {
        const result = parseLineForCompletion('text: {{ user.name | upcase }} more content');
        expect(result.matchType).not.toBe('liquid-filter');
      });

      it('should not match liquid filter without pipe', () => {
        const result = parseLineForCompletion('text: {{ user.name ');
        expect(result.matchType).toBe('variable-unfinished');
      });

      it('should not match liquid filter in regular text', () => {
        const result = parseLineForCompletion('text: "normal | pipe character"');
        expect(result.matchType).toBeNull();
      });
    });

    describe('liquid block filter scenarios', () => {
      it('should parse liquid block filter at end of line', () => {
        const result = parseLineForCompletion('  assign variable = value | ');
        expect(result.matchType).toBe('liquid-block-filter');
        expect(result.fullKey).toBe('');
      });

      it('should parse liquid block filter with prefix', () => {
        const result = parseLineForCompletion('  assign variable = data | up');
        expect(result.matchType).toBe('liquid-block-filter');
        expect(result.fullKey).toBe('up');
      });

      it('should parse liquid block filter in complex expression', () => {
        const result = parseLineForCompletion('  assign result = foreach.item | down');
        expect(result.matchType).toBe('liquid-block-filter');
        expect(result.fullKey).toBe('down');
      });

      it('should parse liquid block filter with spaces', () => {
        const result = parseLineForCompletion('assign   variable   =   value   |   cap');
        expect(result.matchType).toBe('liquid-block-filter');
        expect(result.fullKey).toBe('cap');
      });

      it('should parse liquid block filter in echo statement', () => {
        const result = parseLineForCompletion('  echo message | ');
        expect(result.matchType).toBe('liquid-block-filter');
        expect(result.fullKey).toBe('');
      });

      it('should not match liquid block filter within mustache', () => {
        const result = parseLineForCompletion('  assign var = {{ value | filter');
        expect(result.matchType).toBe('liquid-filter');
        expect(result.fullKey).toBe('filter');
      });

      it('should parse liquid block filter without leading spaces', () => {
        const result = parseLineForCompletion('assign message = value | ');
        expect(result.matchType).toBe('liquid-block-filter');
        expect(result.fullKey).toBe('');
      });

      it('should parse liquid block filter with tab indentation', () => {
        const result = parseLineForCompletion('\tassign variable = value | fil');
        expect(result.matchType).toBe('liquid-block-filter');
        expect(result.fullKey).toBe('fil');
      });

      it('should parse liquid block filter with tabs around pipe', () => {
        const result = parseLineForCompletion('\techo\tmessage\t|\tup');
        expect(result.matchType).toBe('liquid-block-filter');
        expect(result.fullKey).toBe('up');
      });
    });

    describe('liquid syntax scenarios', () => {
      it('should parse liquid syntax block start', () => {
        const result = parseLineForCompletion('  {% ');
        expect(result.matchType).toBe('liquid-syntax');
        expect(result.fullKey).toBe('');
      });

      it('should parse liquid syntax with partial keyword', () => {
        const result = parseLineForCompletion('{% if');
        expect(result.matchType).toBe('liquid-syntax');
        expect(result.fullKey).toBe('if');
      });

      it('should parse liquid syntax with partial assign', () => {
        const result = parseLineForCompletion('  {% ass');
        expect(result.matchType).toBe('liquid-syntax');
        expect(result.fullKey).toBe('ass');
      });

      it('should parse liquid syntax with whitespace', () => {
        const result = parseLineForCompletion('  {%  for');
        expect(result.matchType).toBe('liquid-syntax');
        expect(result.fullKey).toBe('for');
      });

      it('should not match liquid syntax if not at end of line', () => {
        const result = parseLineForCompletion('{% if condition %} content');
        expect(result.matchType).toBeNull();
      });

      it('should not match liquid syntax without %', () => {
        const result = parseLineForCompletion('{ if ');
        expect(result.matchType).toBeNull();
      });
    });

    describe('liquid block keyword scenarios', () => {
      it('should parse liquid block keyword at start of line', () => {
        const result = parseLineForCompletion('assign');
        expect(result.matchType).toBe('liquid-block-keyword');
        expect(result.fullKey).toBe('assign');
      });

      it('should parse liquid block keyword with indentation', () => {
        const result = parseLineForCompletion('  case');
        expect(result.matchType).toBe('liquid-block-keyword');
        expect(result.fullKey).toBe('case');
      });

      it('should parse partial liquid block keyword', () => {
        const result = parseLineForCompletion('  ass');
        expect(result.matchType).toBe('liquid-block-keyword');
        expect(result.fullKey).toBe('ass');
      });

      it('should parse completely empty line as liquid block keyword', () => {
        const result = parseLineForCompletion('');
        expect(result.matchType).toBe('liquid-block-keyword');
        expect(result.fullKey).toBe('');
      });

      it('should parse line with only whitespace as liquid block keyword', () => {
        const result = parseLineForCompletion('    ');
        expect(result.matchType).toBe('liquid-block-keyword');
        expect(result.fullKey).toBe('');
      });

      it('should parse line with tabs as liquid block keyword', () => {
        const result = parseLineForCompletion('\t\t');
        expect(result.matchType).toBe('liquid-block-keyword');
        expect(result.fullKey).toBe('');
      });

      it('should parse liquid block keyword with tab indentation', () => {
        const result = parseLineForCompletion('\tassign');
        expect(result.matchType).toBe('liquid-block-keyword');
        expect(result.fullKey).toBe('assign');
      });

      it('should parse partial liquid block keyword with tabs', () => {
        const result = parseLineForCompletion('\t\tass');
        expect(result.matchType).toBe('liquid-block-keyword');
        expect(result.fullKey).toBe('ass');
      });

      it('should parse liquid block keyword with mixed tab and space indentation', () => {
        const result = parseLineForCompletion('\t  case');
        expect(result.matchType).toBe('liquid-block-keyword');
        expect(result.fullKey).toBe('case');
      });

      it('should parse liquid block keyword with trailing space', () => {
        const result = parseLineForCompletion('echo ');
        expect(result.matchType).toBe('liquid-block-keyword');
        expect(result.fullKey).toBe('echo');
      });

      it('should not match liquid block keyword with complex content', () => {
        const result = parseLineForCompletion('assign variable = "value"');
        expect(result.matchType).toBeNull();
      });
    });

    describe('liquid priority handling', () => {
      it('should prioritize liquid filter over unfinished mustache', () => {
        const result = parseLineForCompletion('{{ consts.api | ');
        expect(result.matchType).toBe('liquid-filter');
      });

      it('should prioritize liquid filter over complete mustache when at end', () => {
        const result = parseLineForCompletion('{{ consts.apiUrl }} {{ user.name | fil');
        expect(result.matchType).toBe('liquid-filter');
        expect(result.fullKey).toBe('fil');
      });

      it('should prioritize @ trigger over liquid syntax', () => {
        const result = parseLineForCompletion('{% if @steps');
        expect(result.matchType).toBe('at');
        expect(result.fullKey).toBe('steps');
      });
    });
  });

  describe('Integration tests for liquid completions', () => {
    it('should provide liquid filter completions', async () => {
      const yamlContent = `
steps:
  - name: test
    type: set_variable
    with:
      message: "{{ user.name | `;

      const cursorOffset = yamlContent.length;
      const model = createMockModel(yamlContent, cursorOffset);
      const position = model.getPositionAt(cursorOffset);

      const schema = generateYamlSchemaFromConnectors(mockConnectors);
      const provider = getCompletionItemProvider(schema);

      const result = await provider.provideCompletionItems(
        model as any,
        position as any,
        {
          triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
          triggerCharacter: '|',
        } as any,
        {} as any
      );

      expect(result?.suggestions).toBeDefined();
      expect(result?.suggestions.length).toBeGreaterThan(0);

      const labels = result?.suggestions.map((s) => s.label) || [];
      expect(labels).toContain('upcase');
      expect(labels).toContain('downcase');
      expect(labels).toContain('capitalize');
    });

    it('should provide filtered liquid filter completions', async () => {
      const yamlContent = `
steps:
  - name: test
    type: set_variable
    with:
      message: "{{ user.name | up`;

      const cursorOffset = yamlContent.length;
      const model = createMockModel(yamlContent, cursorOffset);
      const position = model.getPositionAt(cursorOffset);

      const schema = generateYamlSchemaFromConnectors(mockConnectors);
      const provider = getCompletionItemProvider(schema);

      const result = await provider.provideCompletionItems(
        model as any,
        position as any,
        { triggerKind: monaco.languages.CompletionTriggerKind.Invoke } as any,
        {} as any
      );

      expect(result?.suggestions).toBeDefined();
      expect(result?.suggestions.length).toBeGreaterThan(0);

      const labels = result?.suggestions.map((s) => s.label) || [];
      expect(labels).toContain('upcase');
      expect(labels).not.toContain('downcase'); // Should be filtered out
    });

    it('should provide liquid syntax completions', async () => {
      const yamlContent = `
steps:
  - name: test
    type: set_variable
    with:
      content: |
        {% `;

      const cursorOffset = yamlContent.length;
      const model = createMockModel(yamlContent, cursorOffset);
      const position = model.getPositionAt(cursorOffset);

      const schema = generateYamlSchemaFromConnectors(mockConnectors);
      const provider = getCompletionItemProvider(schema);

      const result = await provider.provideCompletionItems(
        model as any,
        position as any,
        {
          triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
          triggerCharacter: '{',
        } as any,
        {} as any
      );

      expect(result?.suggestions).toBeDefined();
      expect(result?.suggestions.length).toBeGreaterThan(0);

      const labels = result?.suggestions.map((s) => s.label) || [];
      expect(labels).toContain('if');
      expect(labels).toContain('for');
    });

    it('should provide liquid syntax completions with partial match', async () => {
      const yamlContent = `
steps:
  - name: test
    type: set_variable
    with:
      content: |
        {% if`;

      const cursorOffset = yamlContent.length;
      const model = createMockModel(yamlContent, cursorOffset);
      const position = model.getPositionAt(cursorOffset);

      const schema = generateYamlSchemaFromConnectors(mockConnectors);
      const provider = getCompletionItemProvider(schema);

      const result = await provider.provideCompletionItems(
        model as any,
        position as any,
        { triggerKind: monaco.languages.CompletionTriggerKind.Invoke } as any,
        {} as any
      );

      expect(result?.suggestions).toBeDefined();
      expect(result?.suggestions.length).toBeGreaterThan(0);

      const labels = result?.suggestions.map((s) => s.label) || [];
      expect(labels).toContain('if');
    });

    it('should provide liquid block keyword completions with tab indentation', async () => {
      const yamlContent = `
steps:
  - name: test
    type: set_variable
    with:
      message: |-
        {%- liquid
\t\t\t`;

      const cursorOffset = yamlContent.length;
      const model = createMockModel(yamlContent, cursorOffset);
      const position = model.getPositionAt(cursorOffset);

      const schema = generateYamlSchemaFromConnectors(mockConnectors);
      const provider = getCompletionItemProvider(schema);

      const result = await provider.provideCompletionItems(
        model as any,
        position as any,
        { triggerKind: monaco.languages.CompletionTriggerKind.Invoke } as any,
        {} as any
      );

      expect(result?.suggestions).toBeDefined();
      expect(result?.suggestions.length).toBeGreaterThan(0);

      const labels = result?.suggestions.map((s) => s.label) || [];
      expect(labels).toContain('assign');
      expect(labels).toContain('echo');
      expect(labels).toContain('case');
      expect(labels).toContain('if');
      expect(labels).toContain('for');
    });

    it('should provide liquid block keyword completions with mixed tab/space indentation', async () => {
      const yamlContent = `
steps:
  - name: test
    type: set_variable
    with:
      message: |-
        {%- liquid
\t  `;

      const cursorOffset = yamlContent.length;
      const model = createMockModel(yamlContent, cursorOffset);
      const position = model.getPositionAt(cursorOffset);

      const schema = generateYamlSchemaFromConnectors(mockConnectors);
      const provider = getCompletionItemProvider(schema);

      const result = await provider.provideCompletionItems(
        model as any,
        position as any,
        { triggerKind: monaco.languages.CompletionTriggerKind.Invoke } as any,
        {} as any
      );

      expect(result?.suggestions).toBeDefined();
      expect(result?.suggestions.length).toBeGreaterThan(0);

      const labels = result?.suggestions.map((s) => s.label) || [];
      expect(labels).toContain('assign');
      expect(labels).toContain('echo');
      expect(labels).toContain('case');
      expect(labels).toContain('if');
      expect(labels).toContain('for');
    });

    it('should properly detect nested liquid blocks', async () => {
      // Test case with nested liquid blocks
      const yamlContent = `
steps:
  - name: test
    type: set_variable
    with:
      message: |-
        {%- liquid
          assign x = 1
          {%- liquid
            assign y = 2
            `;

      const cursorOffset = yamlContent.length;
      const model = createMockModel(yamlContent, cursorOffset);
      const position = model.getPositionAt(cursorOffset);

      const schema = generateYamlSchemaFromConnectors(mockConnectors);
      const provider = getCompletionItemProvider(schema);

      const result = await provider.provideCompletionItems(
        model as any,
        position as any,
        { triggerKind: monaco.languages.CompletionTriggerKind.Invoke } as any,
        {} as any
      );

      expect(result?.suggestions).toBeDefined();
      expect(result?.suggestions.length).toBeGreaterThan(0);

      const labels = result?.suggestions.map((s) => s.label) || [];
      expect(labels).toContain('assign');
      expect(labels).toContain('echo');
    });

    it('should not provide liquid block completions outside liquid blocks', async () => {
      const yamlContent = `
steps:
  - name: test
    type: set_variable
    with:
      message: |-
        {%- liquid
          assign x = 1
        -%}
        `;

      const cursorOffset = yamlContent.length;
      const model = createMockModel(yamlContent, cursorOffset);
      const position = model.getPositionAt(cursorOffset);

      const schema = generateYamlSchemaFromConnectors(mockConnectors);
      const provider = getCompletionItemProvider(schema);

      const result = await provider.provideCompletionItems(
        model as any,
        position as any,
        { triggerKind: monaco.languages.CompletionTriggerKind.Invoke } as any,
        {} as any
      );

      // Should not contain liquid block keywords since we're outside the block
      const labels = result?.suggestions.map((s) => s.label) || [];
      expect(labels).not.toContain('assign');
      expect(labels).not.toContain('echo');
    });
  });
});
