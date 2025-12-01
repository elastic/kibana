/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import { getFakeAutocompleteContextParams } from '../context/build_autocomplete_context.test';
import { getCompletionItemProvider } from '../get_completion_item_provider';

async function getSuggestions(
  yamlContent: string,
  connectorTypes?: Record<string, ConnectorTypeInfo>
): Promise<monaco.languages.CompletionItem[]> {
  const fakeAutocompleteContextParams = getFakeAutocompleteContextParams(
    yamlContent,
    connectorTypes
  );
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

describe('getCompletionItemProvider - Variable expressions', () => {
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
      expect.arrayContaining(['consts', 'event', 'now', 'workflow', 'steps', 'execution', 'inputs'])
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
      ['consts', 'event', 'kibanaUrl', 'now', 'workflow', 'steps', 'execution', 'inputs'].sort()
    );
    expect(suggestions.map((s) => s.insertText).sort()).toEqual(
      [
        '"{{ event$0 }}"',
        '"{{ execution$0 }}"',
        '"{{ kibanaUrl$0 }}"',
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
    expect(suggestions.map((s) => s.insertText).sort()).toEqual(
      [
        '{{ event$0 }}',
        '{{ execution$0 }}',
        '{{ kibanaUrl$0 }}',
        '{{ workflow$0 }}',
        '{{ inputs$0 }}',
        '{{ consts$0 }}',
        '{{ now$0 }}',
        '{{ steps$0 }}',
      ].sort()
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
      expect.arrayContaining(['consts', 'event', 'now', 'workflow', 'steps', 'execution', 'inputs'])
    );
    expect(suggestions.map((s) => s.insertText)).toEqual(
      expect.arrayContaining([expect.not.stringMatching(/^"[^"]*$/)])
    );
  });

  it('should not quote insertText automatically if cursor is in curly braces already', async () => {
    const yamlContent = `
version: "1"
name: "test"
consts:
  people:
    - Alice
    - Bob
    - Charlie
steps:
  - name: step1
    type: console
    with:
      message: hey {{consts.|<-}}
`.trim();

    const suggestions = await getSuggestions(yamlContent);
    expect(suggestions.map((s) => s.insertText)).toEqual(['people']);
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
    expect(suggestions.map((s) => s.insertText)).toEqual(expect.arrayContaining(['step0']));
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

  it('should autocomplete incomplete key in complete mustache expression', async () => {
    const yamlContent = `
version: "1"
name: "test"
consts:
  apiUrl: "https://api.example.com"
  apiKey: "secret-key"
  timeout: 10
  retryCount: 10
steps:
  - name: step0
    type: console
    with:
      message: "{{ consts.a|<- }}"
`.trim();

    const suggestions = await getSuggestions(yamlContent);
    expect(suggestions.map((s) => s.label)).toEqual(['apiUrl', 'apiKey']);
  });

  it('should not give suggestions when path does not exist in schema and path ends with dot', async () => {
    const yamlContent = `
version: "1"
name: "test"
consts:
  apiUrl: "https://api.example.com"
  apiKey: "secret-key"
  timeout: 10
  retryCount: 10
steps:
  - name: step0
    type: console
    with:  
      message: "{{ consts.docs.|<- }}"
`.trim();

    const suggestions = await getSuggestions(yamlContent);
    expect(suggestions.map((s) => s.label)).toEqual([]);
  });

  it('should not give suggestions when path does not exist in schema', async () => {
    const yamlContent = `
version: "1"
name: "test"
consts:
  apiUrl: "https://api.example.com"
  apiKey: "secret-key"
  timeout: 10
  retryCount: 10
steps:
  - name: step0
    type: console
    with: 
      message: "{{ consts.docs.a|<- }}"
`.trim();

    const suggestions = await getSuggestions(yamlContent);
    expect(suggestions.map((s) => s.label)).toEqual([]);
  });

  it('should not give completions for valid path with a trailing dot if schema of current path is any', async () => {
    const yamlContent = `
version: "1"
name: "test"
consts:
  apiUrl: "https://api.example.com"
steps:
  - name: httpStep
    type: http
    with:
      url: https://google.com
  - name: step1
    type: console
    with:
      message: "{{steps.httpStep.output.|<-}}"
`.trim();

    const suggestions = await getSuggestions(yamlContent);
    expect(suggestions.map((s) => s.label)).toEqual([]);
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
});
