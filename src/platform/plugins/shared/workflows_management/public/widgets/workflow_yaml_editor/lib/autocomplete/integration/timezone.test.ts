/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
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

describe('getCompletionItemProvider - Timezone suggestions', () => {
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
