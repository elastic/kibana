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

describe('getCompletionItemProvider - RRule suggestions', () => {
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
});
