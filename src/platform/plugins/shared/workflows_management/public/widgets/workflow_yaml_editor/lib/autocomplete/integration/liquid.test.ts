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

describe('getCompletionItemProvider - Liquid completions', () => {
  it('should provide liquid filter completions', async () => {
    const yamlContent = `
steps:
  - name: test
    type: set_variable
    with:
      message: "{{ user.name | |<-`;

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
      message: "{{ user.name | up|<-`;

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
        {% |<-`;

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
        {% if|<-`;

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
			|<-`;

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
	  |<-`;

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
            |<-`;

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
        |<-`;

    const result = await getSuggestions(yamlContent);

    // Should not contain liquid block keywords since we're outside the block
    const labels = result.map((s) => s.label) || [];
    expect(labels).not.toContain('assign');
    expect(labels).not.toContain('echo');
  });
});
