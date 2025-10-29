/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { getFakeAutocompleteContextParams } from './build_autocomplete_context.test';
import { getCompletionItemProvider } from './get_completion_item_provider';

async function getSuggestions(yamlContent: string): Promise<monaco.languages.CompletionItem[]> {
  const fakeAutocompleteContextParams = getFakeAutocompleteContextParams(yamlContent);
  const completionProvider = getCompletionItemProvider(
    () => fakeAutocompleteContextParams.editorState
  );

  const result = await completionProvider.provideCompletionItems(
    fakeAutocompleteContextParams.model,
    fakeAutocompleteContextParams.position,
    fakeAutocompleteContextParams.completionContext,
    {
      isCancellationRequested: false,
      onCancellationRequested: () => ({
        dispose: () => {},
      }),
    }
  );

  return result?.suggestions ?? [];
}

describe('getCompletionItemProvider', () => {
  describe('Integration tests', () => {
    it('should provide basic completions inside variable expression', async () => {
      const yamlContent = `
version: "1"
name: "test"
consts:
  apiUrl: "https://api.example.com"
steps:
  - name: step1
    type: console
    with:
      message: "{{|<-}}"
`.trim();
      const suggestions = await getSuggestions(yamlContent);
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
    type: console
    with:
      message: @|<-
`.trim();
      const suggestions = await getSuggestions(yamlContent);
      expect(suggestions.map((s) => s.label).sort()).toEqual(
        ['consts', 'event', 'now', 'workflow', 'steps', 'execution', 'inputs'].sort()
      );
      expect(suggestions.map((s) => s.insertText).sort()).toEqual(
        [
          '"{{ event$0 }}"',
          '"{{ execution$0 }}"',
          '"{{ workflow$0 }}"',
          '"{{ inputs$0 }}"',
          '"{{ consts$0 }}"',
          '"{{ now$0 }}"',
          '"{{ steps$0 }}"',
        ].sort()
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
    type: console
    with:
      message: hey, this is @|<-
`.trim();
      const suggestions = await getSuggestions(yamlContent);
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
    type: console
    with:
      message: "@|<-"
`.trim();

      const suggestions = await getSuggestions(yamlContent);
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
    type: console
    with:
      message: "{{consts.|<-}}"
`.trim();

      const suggestions = await getSuggestions(yamlContent);
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
    type: console
    with:
      message: "{{consts.templates[0].|<-}}"
`.trim();

      const suggestions = await getSuggestions(yamlContent);
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
    type: console
    with:
      message: "hello"
  - name: step1
    type: console
    with:
      message: "{{steps.|<-}}"
`.trim();

      const suggestions = await getSuggestions(yamlContent);
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
        type: console
        with:
          message: "im true"
      - name: second-true-step
        type: console
        with:
          message: "im true, {{steps.|<-}}"
    else:
      - name: false-step
        type: console
        with:
          message: "im unreachable"
`.trim();

      const suggestions = await getSuggestions(yamlContent);
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
    type: console
    with:
      message: "{{consts.a|<-}}"
`.trim();

      const suggestions = await getSuggestions(yamlContent);
      expect(suggestions.map((s) => s.label)).toEqual(expect.arrayContaining(['apiUrl']));
    });

    it('should provide completions with brackets for keys in kebab-case and use single quotes when inside double quoted string', async () => {
      const yamlContent = `
version: "1"
name: "test"
consts:
  api-url: "https://api.example.com"
steps:
  - name: step0
    type: console
    with:
      message: "{{consts.|<-}}"
`.trim();
      const suggestions = await getSuggestions(yamlContent);
      expect(suggestions.map((s) => s.insertText)).toEqual(expect.arrayContaining(["['api-url']"]));
    });

    it('should provide completions with brackets for keys in kebab-case and use double quotes when inside single quoted string', async () => {
      const yamlContent = `
version: "1"
name: "test"
consts:
  api-url: "https://api.example.com"
steps:
  - name: step0
    type: console
    with:
      message: '{{consts.|<-}}'
      `.trim();
      const suggestions = await getSuggestions(yamlContent);
      expect(suggestions.map((s) => s.insertText)).toEqual(expect.arrayContaining(['["api-url"]']));
    });

    // CURRENT
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

      const suggestions = await getSuggestions(yamlContent);
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

      const suggestions = await getSuggestions(yamlContent);
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

      const suggestions = await getSuggestions(yamlContent);
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

      const suggestions = await getSuggestions(yamlContent);
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

      const suggestions = await getSuggestions(yamlContent);
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

      const suggestions = await getSuggestions(yamlContent);
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

      const suggestions = await getSuggestions(yamlContent);

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

      const suggestions = await getSuggestions(yamlContent);

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

      const suggestions = await getSuggestions(yamlContent);

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

      const suggestions = await getSuggestions(yamlContent);

      // Should have timezone suggestions
      expect(suggestions.length).toBeGreaterThan(0);

      // Check that suggestions have InsertAsSnippet insertTextRules
      const firstSuggestion = suggestions[0];
      expect(firstSuggestion?.insertTextRules).toBe(
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      );
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

      const result = await getSuggestions(yamlContent);

      expect(result.length).toBeGreaterThan(0);

      const labels = result.map((s) => s.label) || [];
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

      const result = await getSuggestions(yamlContent);

      expect(result.length).toBeGreaterThan(0);

      const labels = result.map((s) => s.label) || [];
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

      const result = await getSuggestions(yamlContent);

      expect(result.length).toBeGreaterThan(0);

      const labels = result.map((s) => s.label) || [];
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

      const result = await getSuggestions(yamlContent);

      expect(result.length).toBeGreaterThan(0);

      const labels = result.map((s) => s.label) || [];
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

      const result = await getSuggestions(yamlContent);

      expect(result.length).toBeGreaterThan(0);

      const labels = result.map((s) => s.label) || [];
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

      const result = await getSuggestions(yamlContent);

      expect(result.length).toBeGreaterThan(0);

      const labels = result.map((s) => s.label) || [];
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

      const result = await getSuggestions(yamlContent);

      expect(result.length).toBeGreaterThan(0);

      const labels = result.map((s) => s.label) || [];
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

      const result = await getSuggestions(yamlContent);

      // Should not contain liquid block keywords since we're outside the block
      const labels = result.map((s) => s.label) || [];
      expect(labels).not.toContain('assign');
      expect(labels).not.toContain('echo');
    });
  });
});
