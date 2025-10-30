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
import { z } from '@kbn/zod';
import { getFakeAutocompleteContextParams } from './context/build_autocomplete_context.test';
import { getCompletionItemProvider } from './get_completion_item_provider';
import * as getConnectorWithSchemaModule from './suggestions/connector_with/get_connector_with_schema';
import * as getExistingParametersModule from './suggestions/connector_with/get_existing_parameters_in_with_block';
import * as getWithBlockSuggestionsModule from './suggestions/connector_with/get_with_block_suggestions';
import * as generateConnectorSnippetModule from '../snippets/generate_connector_snippet';

// Mock the modules
jest.mock('./suggestions/connector_with/get_with_block_suggestions');
jest.mock('./suggestions/connector_with/get_connector_with_schema');
jest.mock('./suggestions/connector_with/get_existing_parameters_in_with_block');
jest.mock('../snippets/generate_connector_snippet');

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

describe('getCompletionItemProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mocks to their default implementations
    jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([]);
    jest.mocked(getConnectorWithSchemaModule.getConnectorParamsSchema).mockReturnValue(null);
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

    // TODO: fix, this is failing because we now trying to fix yaml syntax before passing yaml to the autocomplete context
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

  describe('Integration tests for with block suggestions', () => {
    beforeEach(() => {
      // Reset mocks for each test
      jest.clearAllMocks();

      // Set up default mock for existing parameters (empty set)
      jest
        .mocked(getExistingParametersModule.getExistingParametersInWithBlock)
        .mockReturnValue(new Set());
    });

    it('should handle with blocks gracefully without dynamic connectors', async () => {
      const yamlContent = `
version: "1"
name: "test"
steps:
  - name: send-email
    type: email
    connector_id: email-1
    with:
      |<-
`.trim();

      // Mock getWithBlockSuggestions to return empty array when no connector types available
      jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([]);

      const suggestions = await getSuggestions(yamlContent);

      // Without dynamic connector types, we expect no suggestions
      expect(suggestions).toEqual([]);
      expect(getWithBlockSuggestionsModule.getWithBlockSuggestions).toHaveBeenCalled();
    });

    it('should provide value suggestions when typing after colon', async () => {
      const yamlContent = `
version: "1"
name: "test"
steps:
  - name: set-var
    type: set_variable
    with:
      enabled: |<-
`.trim();

      // Mock getWithBlockSuggestions to return boolean value suggestions
      jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
        {
          label: 'true',
          kind: monaco.languages.CompletionItemKind.Value,
          insertText: 'true',
          range: {
            startLineNumber: 7,
            endLineNumber: 7,
            startColumn: 1,
            endColumn: 100,
          },
          documentation: 'Boolean true value',
        },
        {
          label: 'false',
          kind: monaco.languages.CompletionItemKind.Value,
          insertText: 'false',
          range: {
            startLineNumber: 7,
            endLineNumber: 7,
            startColumn: 1,
            endColumn: 100,
          },
          documentation: 'Boolean false value',
        },
      ]);

      const suggestions = await getSuggestions(yamlContent);

      // Should provide boolean value suggestions
      expect(suggestions.map((s) => s.label)).toEqual(['true', 'false']);
      expect(suggestions[0].kind).toBe(monaco.languages.CompletionItemKind.Value);
    });

    it('should not provide suggestions when connector type is not found', async () => {
      const yamlContent = `
version: "1"
name: "test"
steps:
  - name: unknown-step
    type: unknown_connector
    with:
      |<-
`.trim();

      // Mock getWithBlockSuggestions to return empty for unknown connector
      jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([]);

      const suggestions = await getSuggestions(yamlContent);

      // Should not provide any suggestions for unknown connector type
      expect(suggestions).toHaveLength(0);
    });

    it('should not provide suggestions when value is being typed after colon with content', async () => {
      const yamlContent = `
version: "1"
name: "test"
steps:
  - name: send-email
    type: email
    connector_id: email-1
    with:
      subject: Test |<-
`.trim();

      // Mock getWithBlockSuggestions to return empty when typing values
      jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([]);

      const suggestions = await getSuggestions(yamlContent);

      // Should not provide parameter suggestions when typing a value
      expect(suggestions).toEqual([]);
    });

    // Real-life Slack connector scenarios
    describe('Slack connector real-life scenarios', () => {
      const slackConnectorType: Record<string, ConnectorTypeInfo> = {
        slack: {
          actionTypeId: 'slack',
          displayName: 'Slack',
          instances: [
            {
              id: 'slack-main',
              name: 'Main Slack Workspace',
              isPreconfigured: false,
              isDeprecated: false,
            },
          ],
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'gold',
          subActions: [],
        },
      };

      beforeEach(() => {
        // Mock Slack connector schema
        jest
          .mocked(getConnectorWithSchemaModule.getConnectorParamsSchema)
          .mockImplementation((connectorType, _dynamicConnectorTypes) => {
            if (connectorType === 'slack') {
              return {
                channel: z.string().describe('The Slack channel to post to'),
                message: z.string().describe('The message to send'),
                thread_ts: z.string().optional().describe('Thread timestamp for replies'),
                icon_url: z.string().optional().describe('Icon URL for the message'),
                username: z.string().optional().describe('Username to display'),
              };
            }
            return null;
          });

        // Mock enhanced type info for better documentation
        jest
          .mocked(generateConnectorSnippetModule.getEnhancedTypeInfo)
          .mockImplementation((schema) => {
            if (schema instanceof z.ZodString) {
              const description = schema.description;
              return {
                type: 'string',
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description,
                example: description?.includes('channel') ? '#general' : undefined,
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

      it('should suggest Slack message parameters in a notification workflow', async () => {
        const yamlContent = `
version: "1"
name: "alert-notification"
triggers:
  - type: webhook
steps:
  - name: notify-team
    type: slack
    connector_id: slack-main
    with:
      |<-
`.trim();

        // Mock getWithBlockSuggestions to return Slack parameter suggestions
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'channel',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'channel: "${1:#general}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 10,
              endLineNumber: 10,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!channel',
            detail: 'string (required)',
            documentation: {
              value:
                '**slack Parameter: channel**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** The Slack channel to post to\n\n**Example:** `#general`\n\n*This parameter is specific to the slack connector.*',
            },
            preselect: true,
          },
          {
            label: 'message',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'message: "${1:}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 10,
              endLineNumber: 10,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!message',
            detail: 'string (required)',
            documentation: {
              value:
                '**slack Parameter: message**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** The message to send\n\n*This parameter is specific to the slack connector.*',
            },
            preselect: true,
          },
          {
            label: 'thread_ts',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'thread_ts: "${1:}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 10,
              endLineNumber: 10,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!thread_ts',
            detail: 'string (optional)',
            documentation: {
              value:
                '**slack Parameter: thread_ts**\n\n**Type:** `string`\n**Required:** No\n\n**Description:** Thread timestamp for replies\n\n*This parameter is specific to the slack connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, slackConnectorType);

        // Should provide Slack-specific parameter suggestions
        expect(suggestions.map((s) => s.label)).toEqual(['channel', 'message', 'thread_ts']);
        expect(suggestions[0].insertText).toBe('channel: "${1:#general}"');
        expect(suggestions[0].detail).toBe('string (required)');
        expect(suggestions[1].label).toBe('message');
        expect(suggestions[2].detail).toBe('string (optional)');
      });

      it('should filter out existing parameters when suggesting', async () => {
        const yamlContent = `
version: "1"
name: "incident-response"
steps:
  - name: slack-alert
    type: slack
    connector_id: slack-ops
    with:
      channel: "#incidents"
      |<-
`.trim();

        // Mock existing parameters to exclude 'channel'
        jest
          .mocked(getExistingParametersModule.getExistingParametersInWithBlock)
          .mockReturnValue(new Set(['channel']));

        // Mock suggestions to return only parameters not already present
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'message',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'message: "${1:}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 10,
              endLineNumber: 10,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!message',
            detail: 'string (required)',
            documentation: {
              value:
                '**slack Parameter: message**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** The message to send\n\n*This parameter is specific to the slack connector.*',
            },
            preselect: true,
          },
          {
            label: 'thread_ts',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'thread_ts: "${1:}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 10,
              endLineNumber: 10,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!thread_ts',
            detail: 'string (optional)',
            documentation: {
              value:
                '**slack Parameter: thread_ts**\n\n**Type:** `string`\n**Required:** No\n\n**Description:** Thread timestamp for replies\n\n*This parameter is specific to the slack connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, slackConnectorType);

        // Should only suggest parameters that are not already present
        expect(suggestions).toHaveLength(2);
        expect(suggestions.map((s) => s.label)).toEqual(['message', 'thread_ts']);
        expect(suggestions[0].detail).toBe('string (required)');
        expect(suggestions[1].detail).toBe('string (optional)');
      });

      // NOTE: In a real editor scenario, when a user types "mess" without a colon,
      // the autocomplete would filter available parameters starting with "mess".
      // However, the test environment requires valid YAML, so we can't test
      // the exact scenario of "mess|<-" as it creates invalid YAML.
      // The real implementation would handle this through the editor's tokenization
      // and partial parsing capabilities.

      it('should handle incomplete parameter names at different stages', async () => {
        // Test case 1: Just 'm'
        const yamlContent1 = `
version: "1"
name: "test"
steps:
  - name: slack-alert
    type: slack
    with:
      m|<-
`.trim();

        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'message',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'essage: "${1:}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 7,
              endColumn: 8,
            },
            sortText: '!message',
            detail: 'string (required)',
            documentation: {
              value:
                '**slack Parameter: message**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** The message to send\n\n*This parameter is specific to the slack connector.*',
            },
            preselect: true,
            filterText: 'message',
          },
        ]);

        const suggestions1 = await getSuggestions(yamlContent1, slackConnectorType);
        expect(suggestions1).toHaveLength(1);
        expect(suggestions1[0].label).toBe('message');
        expect(suggestions1[0].insertText).toBe('essage: "${1:}"');

        // Test case 2: Empty line (all parameters)
        const yamlContent2 = `
version: "1"
name: "test"
steps:
  - name: slack-alert
    type: slack
    with:
      |<-
`.trim();

        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'channel',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'channel: "${1:#general}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!channel',
            detail: 'string (required)',
            documentation: {
              value:
                '**slack Parameter: channel**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** The Slack channel to post to\n\n*This parameter is specific to the slack connector.*',
            },
            preselect: true,
          },
          {
            label: 'message',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'message: "${1:}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!message',
            detail: 'string (required)',
            documentation: {
              value:
                '**slack Parameter: message**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** The message to send\n\n*This parameter is specific to the slack connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions2 = await getSuggestions(yamlContent2, slackConnectorType);
        expect(suggestions2.map((s) => s.label)).toEqual(['channel', 'message']);
      });

      it('should suggest thread_ts for threaded Slack messages', async () => {
        const yamlContent = `
version: "1"
name: "thread-reply"
steps:
  - name: reply-to-thread
    type: slack
    connector_id: slack-bot
    with:
      channel: "{{ steps.original_message.output.channel }}"
      message: "Update: Issue resolved"
      |<-
`.trim();

        // Mock existing parameters
        jest
          .mocked(getExistingParametersModule.getExistingParametersInWithBlock)
          .mockReturnValue(new Set(['channel', 'message']));

        // Mock suggestions for remaining parameters
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'thread_ts',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'thread_ts: "${1:}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 10,
              endLineNumber: 10,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!thread_ts',
            detail: 'string (optional)',
            documentation: {
              value:
                '**slack Parameter: thread_ts**\n\n**Type:** `string`\n**Required:** No\n\n**Description:** Thread timestamp for replies\n\n*This parameter is specific to the slack connector.*',
            },
            preselect: true,
          },
          {
            label: 'icon_url',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'icon_url: "${1:}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 10,
              endLineNumber: 10,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!icon_url',
            detail: 'string (optional)',
            documentation: {
              value:
                '**slack Parameter: icon_url**\n\n**Type:** `string`\n**Required:** No\n\n**Description:** Icon URL for the message\n\n*This parameter is specific to the slack connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, slackConnectorType);

        // Should suggest remaining optional parameters
        expect(suggestions.map((s) => s.label)).toEqual(['thread_ts', 'icon_url']);
        expect(suggestions[0].detail).toBe('string (optional)');
      });
    });

    // Real-life Email connector scenarios
    describe('Email connector real-life scenarios', () => {
      const emailConnectorType: Record<string, ConnectorTypeInfo> = {
        email: {
          actionTypeId: 'email',
          displayName: 'Email',
          instances: [
            {
              id: 'smtp-server',
              name: 'Company SMTP Server',
              isPreconfigured: false,
              isDeprecated: false,
            },
          ],
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'gold',
          subActions: [],
        },
      };

      beforeEach(() => {
        // Mock Email connector schema
        jest
          .mocked(getConnectorWithSchemaModule.getConnectorParamsSchema)
          .mockImplementation((connectorType, _dynamicConnectorTypes) => {
            if (connectorType === 'email') {
              return {
                to: z.array(z.string()).describe('Recipients email addresses'),
                cc: z.array(z.string()).optional().describe('CC recipients'),
                bcc: z.array(z.string()).optional().describe('BCC recipients'),
                subject: z.string().describe('Email subject'),
                message: z.string().describe('Email message body'),
                messageHTML: z.string().optional().describe('HTML version of the message'),
              };
            }
            return null;
          });

        // Mock enhanced type info
        jest
          .mocked(generateConnectorSnippetModule.getEnhancedTypeInfo)
          .mockImplementation((schema) => {
            if (schema instanceof z.ZodArray) {
              return {
                type: 'string[]',
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
                example: undefined,
              };
            } else if (schema instanceof z.ZodString) {
              return {
                type: 'string',
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
                example: schema.description?.includes('subject')
                  ? 'Alert: System Error'
                  : undefined,
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

      it('should suggest email parameters for incident notification', async () => {
        const yamlContent = `
version: "1"
name: "security-alert"
consts:
  recipients:
    - security@company.com
    - ops@company.com
steps:
  - name: send-alert
    type: email
    connector_id: smtp-server
    with:
      |<-
`.trim();

        // Mock getWithBlockSuggestions to return email parameter suggestions
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'to',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'to:\n  - "${1:}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 11,
              endLineNumber: 11,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!to',
            detail: 'string[] (required)',
            documentation: {
              value:
                '**email Parameter: to**\n\n**Type:** `string[]`\n**Required:** Yes\n\n**Description:** Recipients email addresses\n\n*This parameter is specific to the email connector.*',
            },
            preselect: true,
          },
          {
            label: 'subject',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'subject: "${1:Alert: System Error}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 11,
              endLineNumber: 11,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!subject',
            detail: 'string (required)',
            documentation: {
              value:
                '**email Parameter: subject**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** Email subject\n\n**Example:** `Alert: System Error`\n\n*This parameter is specific to the email connector.*',
            },
            preselect: true,
          },
          {
            label: 'message',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'message: "${1:}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 11,
              endLineNumber: 11,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!message',
            detail: 'string (required)',
            documentation: {
              value:
                '**email Parameter: message**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** Email message body\n\n*This parameter is specific to the email connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, emailConnectorType);

        // Should provide email-specific parameter suggestions
        expect(suggestions.map((s) => s.label)).toEqual(['to', 'subject', 'message']);
        expect(suggestions[0].insertText).toBe('to:\n  - "${1:}"');
        expect(suggestions[0].detail).toBe('string[] (required)');
        expect(suggestions[1].insertText).toBe('subject: "${1:Alert: System Error}"');
      });

      it('should handle HTML email template scenario', async () => {
        const yamlContent = `
version: "1"
name: "weekly-report"
steps:
  - name: generate-report
    type: elasticsearch.search
    with:
      index: metrics-*
      size: 100
  - name: email-report
    type: email
    connector_id: email-service
    with:
      to: ["{{ consts.report_recipients }}"]
      subject: "Weekly Performance Report - {{ now | date: '%Y-%m-%d' }}"
      |<-
`.trim();

        // Mock existing parameters
        jest
          .mocked(getExistingParametersModule.getExistingParametersInWithBlock)
          .mockReturnValue(new Set(['to', 'subject']));

        // Mock suggestions for remaining parameters
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'message',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'message: "${1:}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 14,
              endLineNumber: 14,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!message',
            detail: 'string (required)',
            documentation: {
              value:
                '**email Parameter: message**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** Email message body\n\n*This parameter is specific to the email connector.*',
            },
            preselect: true,
          },
          {
            label: 'messageHTML',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'messageHTML: "${1:}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 14,
              endLineNumber: 14,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!messageHTML',
            detail: 'string (optional)',
            documentation: {
              value:
                '**email Parameter: messageHTML**\n\n**Type:** `string`\n**Required:** No\n\n**Description:** HTML version of the message\n\n*This parameter is specific to the email connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, emailConnectorType);

        // Should suggest remaining parameters
        expect(suggestions.map((s) => s.label)).toEqual(['message', 'messageHTML']);
        expect(suggestions[0].detail).toBe('string (required)');
        expect(suggestions[1].detail).toBe('string (optional)');
      });
    });

    // Real-life Elasticsearch connector scenarios
    describe('Elasticsearch connector real-life scenarios', () => {
      const elasticsearchConnectorTypes: Record<string, ConnectorTypeInfo> = {
        'elasticsearch.search': {
          actionTypeId: 'elasticsearch.search',
          displayName: 'Elasticsearch Search',
          instances: [],
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          subActions: [],
        },
        'elasticsearch.bulk': {
          actionTypeId: 'elasticsearch.bulk',
          displayName: 'Elasticsearch Bulk',
          instances: [],
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          subActions: [],
        },
      };

      beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock Elasticsearch connector schemas
        jest
          .mocked(getConnectorWithSchemaModule.getConnectorParamsSchema)
          .mockImplementation(
            (connectorType, _dynamicConnectorTypes): Record<string, z.ZodType> | null => {
              if (connectorType === 'elasticsearch.search') {
                return {
                  index: z.string().describe('The index pattern to search'),
                  body: z.object({}).passthrough().optional().describe('The search request body'),
                  size: z.number().optional().describe('Number of results to return'),
                  from: z.number().optional().describe('Starting offset for pagination'),
                  sort: z.array(z.any()).optional().describe('Sort criteria'),
                  _source: z
                    .union([z.boolean(), z.array(z.string())])
                    .optional()
                    .describe('Source fields to return'),
                  track_total_hits: z.boolean().optional().describe('Whether to track total hits'),
                };
              } else if (connectorType === 'elasticsearch.bulk') {
                return {
                  index: z.string().optional().describe('Default index for bulk operations'),
                  body: z.array(z.any()).describe('Array of bulk operations'),
                  refresh: z
                    .enum(['true', 'false', 'wait_for'])
                    .optional()
                    .describe('Refresh policy'),
                  pipeline: z.string().optional().describe('Ingest pipeline to use'),
                };
              }
              return null;
            }
          );

        // Mock enhanced type info
        jest
          .mocked(generateConnectorSnippetModule.getEnhancedTypeInfo)
          .mockImplementation((schema) => {
            if (schema instanceof z.ZodString) {
              return {
                type: 'string',
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
                example: schema.description?.includes('index') ? 'logs-*' : undefined,
              };
            } else if (schema instanceof z.ZodNumber) {
              return {
                type: 'number',
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
                example: schema.description?.includes('size') ? '100' : '0',
              };
            } else if (schema instanceof z.ZodBoolean) {
              return {
                type: 'boolean',
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
                example: undefined,
              };
            } else if (schema instanceof z.ZodObject) {
              return {
                type: 'object',
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
                example: undefined,
              };
            } else if (schema instanceof z.ZodArray) {
              return {
                type: 'any[]',
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
                example: undefined,
              };
            } else if (schema instanceof z.ZodUnion) {
              return {
                type: 'boolean | string[]',
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
                example: undefined,
              };
            } else if (schema instanceof z.ZodEnum) {
              const values = schema._def.values as string[];
              return {
                type: `enum: ${values.join(' | ')}`,
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
                example: values[0],
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

      it('should suggest search parameters for log analysis', async () => {
        const yamlContent = `
version: "1"
name: "error-log-analysis"
steps:
  - name: search-errors
    type: elasticsearch.search
    with:
      |<-
`.trim();

        // Mock the suggestions for elasticsearch.search
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'index',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'index: "${1:logs-*}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!index',
            detail: 'string (required)',
            documentation: {
              value:
                '**elasticsearch.search Parameter: index**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** The index pattern to search\n\n**Example:** `logs-*`\n\n*This parameter is specific to the elasticsearch.search connector.*',
            },
            preselect: true,
          },
          {
            label: 'body',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'body:\n  ${1:}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!body',
            detail: 'object (optional)',
            documentation: {
              value:
                '**elasticsearch.search Parameter: body**\n\n**Type:** `object`\n**Required:** No\n\n**Description:** The search request body\n\n*This parameter is specific to the elasticsearch.search connector.*',
            },
            preselect: true,
          },
          {
            label: 'size',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'size: ${1:100}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!size',
            detail: 'number (optional)',
            documentation: {
              value:
                '**elasticsearch.search Parameter: size**\n\n**Type:** `number`\n**Required:** No\n\n**Description:** Number of results to return\n\n**Example:** `100`\n\n*This parameter is specific to the elasticsearch.search connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, elasticsearchConnectorTypes);

        // Verify we get the expected Elasticsearch search parameters
        expect(suggestions).toHaveLength(3);
        expect(suggestions.map((s) => s.label)).toEqual(['index', 'body', 'size']);

        // Verify the index parameter details
        const indexSuggestion = suggestions[0];
        expect(indexSuggestion.insertText).toBe('index: "${1:logs-*}"');
        expect(indexSuggestion.detail).toBe('string (required)');
        expect(indexSuggestion.kind).toBe(monaco.languages.CompletionItemKind.Variable);

        // Verify the body parameter details
        const bodySuggestion = suggestions[1];
        expect(bodySuggestion.insertText).toBe('body:\n  ${1:}');
        expect(bodySuggestion.detail).toBe('object (optional)');

        // Verify the size parameter details
        const sizeSuggestion = suggestions[2];
        expect(sizeSuggestion.insertText).toBe('size: ${1:100}');
        expect(sizeSuggestion.detail).toBe('number (optional)');
      });

      it('should handle aggregation query scenario', async () => {
        const yamlContent = `
version: "1"
name: "metrics-aggregation"
steps:
  - name: aggregate-metrics
    type: elasticsearch.search
    with:
      index: "logs-*"
      body:
        query:
          range:
            "@timestamp":
              gte: "now-1h"
        |<-
`.trim();

        // Mock existing parameters
        jest
          .mocked(getExistingParametersModule.getExistingParametersInWithBlock)
          .mockReturnValue(new Set(['index', 'body']));

        // Mock remaining suggestions
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'aggs',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'aggs:\n  ${1:}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 14,
              endLineNumber: 14,
              startColumn: 9,
              endColumn: 100,
            },
            sortText: '!aggs',
            detail: 'object (optional)',
            documentation: {
              value:
                '**elasticsearch.search Parameter: aggs**\n\n**Type:** `object`\n**Required:** No\n\n**Description:** Aggregations to perform\n\n*This parameter is specific to the elasticsearch.search connector.*',
            },
            preselect: true,
          },
        ]);

        // Note: In a real scenario, this would be inside the body object,
        // but for testing we're showing that parameters can be suggested
        const suggestions = await getSuggestions(yamlContent, elasticsearchConnectorTypes);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].label).toBe('aggs');
        expect(suggestions[0].insertText).toBe('aggs:\n  ${1:}');
        expect(suggestions[0].detail).toBe('object (optional)');
      });

      it('should suggest bulk operation parameters', async () => {
        const yamlContent = `
version: "1"
name: "data-migration"
steps:
  - name: bulk-index
    type: elasticsearch.bulk
    with:
      |<-
`.trim();

        // Mock bulk operation suggestions
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'body',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'body:\n  - ${1:}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!body',
            detail: 'any[] (required)',
            documentation: {
              value:
                '**elasticsearch.bulk Parameter: body**\n\n**Type:** `any[]`\n**Required:** Yes\n\n**Description:** Array of bulk operations\n\n*This parameter is specific to the elasticsearch.bulk connector.*',
            },
            preselect: true,
          },
          {
            label: 'index',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'index: "${1:}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!index',
            detail: 'string (optional)',
            documentation: {
              value:
                '**elasticsearch.bulk Parameter: index**\n\n**Type:** `string`\n**Required:** No\n\n**Description:** Default index for bulk operations\n\n*This parameter is specific to the elasticsearch.bulk connector.*',
            },
            preselect: true,
          },
          {
            label: 'refresh',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'refresh: ${1:true}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!refresh',
            detail: 'enum: true | false | wait_for (optional)',
            documentation: {
              value:
                '**elasticsearch.bulk Parameter: refresh**\n\n**Type:** `enum: true | false | wait_for`\n**Required:** No\n\n**Description:** Refresh policy\n\n**Example:** `true`\n\n*This parameter is specific to the elasticsearch.bulk connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, elasticsearchConnectorTypes);

        // Verify bulk operation parameters
        expect(suggestions).toHaveLength(3);
        expect(suggestions.map((s) => s.label)).toEqual(['body', 'index', 'refresh']);

        // Verify body parameter (required array)
        expect(suggestions[0].insertText).toBe('body:\n  - ${1:}');
        expect(suggestions[0].detail).toBe('any[] (required)');

        // Verify refresh parameter (enum)
        expect(suggestions[2].label).toBe('refresh');
        expect(suggestions[2].insertText).toBe('refresh: ${1:true}');
        expect(suggestions[2].detail).toBe('enum: true | false | wait_for (optional)');
      });
    });

    // Real-life Webhook connector scenarios
    describe('Webhook connector real-life scenarios', () => {
      const webhookConnectorType: Record<string, ConnectorTypeInfo> = {
        webhook: {
          actionTypeId: 'webhook',
          displayName: 'Webhook',
          instances: [
            {
              id: 'github-webhook',
              name: 'GitHub API',
              isPreconfigured: false,
              isDeprecated: false,
            },
          ],
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'gold',
          subActions: [],
        },
      };

      beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock Webhook connector schema
        jest
          .mocked(getConnectorWithSchemaModule.getConnectorParamsSchema)
          .mockImplementation((connectorType, _dynamicConnectorTypes) => {
            if (connectorType === 'webhook') {
              return {
                url: z.string().describe('The URL to send the request to'),
                method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).describe('HTTP method'),
                headers: z.record(z.string()).optional().describe('HTTP headers'),
                body: z.any().optional().describe('Request body'),
                hasAuth: z.boolean().optional().describe('Whether authentication is configured'),
              };
            }
            return null;
          });

        // Mock enhanced type info
        jest
          .mocked(generateConnectorSnippetModule.getEnhancedTypeInfo)
          .mockImplementation((schema) => {
            if (schema instanceof z.ZodString) {
              return {
                type: 'string',
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
                example: schema.description?.includes('URL')
                  ? 'https://api.example.com/webhook'
                  : undefined,
              };
            } else if (schema instanceof z.ZodEnum) {
              const values = schema._def.values as string[];
              return {
                type: `enum: ${values.join(' | ')}`,
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
                example: 'POST',
              };
            } else if (schema instanceof z.ZodRecord) {
              return {
                type: 'object',
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
                example: undefined,
              };
            } else if (schema instanceof z.ZodBoolean) {
              return {
                type: 'boolean',
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
                example: undefined,
              };
            }
            return {
              type: 'any',
              isRequired: !schema.isOptional(),
              isOptional: schema.isOptional(),
              description: schema.description,
              example: undefined,
            };
          });
      });

      it('should suggest webhook parameters for external API integration', async () => {
        const yamlContent = `
version: "1"
name: "github-integration"
consts:
  github_api: "https://api.github.com"
steps:
  - name: create-issue
    type: webhook
    connector_id: github-webhook
    with:
      |<-
`.trim();

        // Mock webhook suggestions
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'url',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'url: "${1:https://api.example.com/webhook}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 9,
              endLineNumber: 9,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!url',
            detail: 'string (required)',
            documentation: {
              value:
                '**webhook Parameter: url**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** The URL to send the request to\n\n**Example:** `https://api.example.com/webhook`\n\n*This parameter is specific to the webhook connector.*',
            },
            preselect: true,
          },
          {
            label: 'method',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'method: ${1:POST}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 9,
              endLineNumber: 9,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!method',
            detail: 'enum: GET | POST | PUT | DELETE | PATCH (required)',
            documentation: {
              value:
                '**webhook Parameter: method**\n\n**Type:** `enum: GET | POST | PUT | DELETE | PATCH`\n**Required:** Yes\n\n**Description:** HTTP method\n\n**Example:** `POST`\n\n*This parameter is specific to the webhook connector.*',
            },
            preselect: true,
          },
          {
            label: 'headers',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'headers:\n  ${1:}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 9,
              endLineNumber: 9,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!headers',
            detail: 'object (optional)',
            documentation: {
              value:
                '**webhook Parameter: headers**\n\n**Type:** `object`\n**Required:** No\n\n**Description:** HTTP headers\n\n*This parameter is specific to the webhook connector.*',
            },
            preselect: true,
          },
          {
            label: 'body',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'body:\n  ${1:}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 9,
              endLineNumber: 9,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!body',
            detail: 'any (optional)',
            documentation: {
              value:
                '**webhook Parameter: body**\n\n**Type:** `any`\n**Required:** No\n\n**Description:** Request body\n\n*This parameter is specific to the webhook connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, webhookConnectorType);

        // Verify webhook parameters
        expect(suggestions).toHaveLength(4);
        expect(suggestions.map((s) => s.label)).toEqual(['url', 'method', 'headers', 'body']);

        // Verify URL parameter
        expect(suggestions[0].insertText).toBe('url: "${1:https://api.example.com/webhook}"');
        expect(suggestions[0].detail).toBe('string (required)');

        // Verify method parameter (enum)
        expect(suggestions[1].insertText).toBe('method: ${1:POST}');
        expect(suggestions[1].detail).toBe('enum: GET | POST | PUT | DELETE | PATCH (required)');

        // Verify headers parameter
        expect(suggestions[2].insertText).toBe('headers:\n  ${1:}');
        expect(suggestions[2].detail).toBe('object (optional)');
      });

      it('should handle webhook with authentication headers', async () => {
        const yamlContent = `
version: "1"
name: "api-call"
steps:
  - name: call-external-api
    type: webhook
    connector_id: api-connector
    with:
      url: "{{ consts.api_endpoint }}"
      method: POST
      headers:
        Authorization: "Bearer {{ secrets.api_token }}"
        Content-Type: "application/json"
      |<-
`.trim();

        // Mock existing parameters
        jest
          .mocked(getExistingParametersModule.getExistingParametersInWithBlock)
          .mockReturnValue(new Set(['url', 'method', 'headers']));

        // Mock remaining suggestions
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'body',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'body:\n  ${1:}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 12,
              endLineNumber: 12,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!body',
            detail: 'any (optional)',
            documentation: {
              value:
                '**webhook Parameter: body**\n\n**Type:** `any`\n**Required:** No\n\n**Description:** Request body\n\n*This parameter is specific to the webhook connector.*',
            },
            preselect: true,
          },
          {
            label: 'hasAuth',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'hasAuth: ${1:true}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 12,
              endLineNumber: 12,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!hasAuth',
            detail: 'boolean (optional)',
            documentation: {
              value:
                '**webhook Parameter: hasAuth**\n\n**Type:** `boolean`\n**Required:** No\n\n**Description:** Whether authentication is configured\n\n*This parameter is specific to the webhook connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, webhookConnectorType);

        // Should only suggest parameters not already present
        expect(suggestions).toHaveLength(2);
        expect(suggestions.map((s) => s.label)).toEqual(['body', 'hasAuth']);

        // Verify body parameter
        expect(suggestions[0].insertText).toBe('body:\n  ${1:}');
        expect(suggestions[0].detail).toBe('any (optional)');

        // Verify hasAuth parameter
        expect(suggestions[1].insertText).toBe('hasAuth: ${1:true}');
        expect(suggestions[1].detail).toBe('boolean (optional)');
      });
    });

    // Real-life PagerDuty connector scenarios
    describe('PagerDuty connector real-life scenarios', () => {
      const pagerdutyConnectorType: Record<string, ConnectorTypeInfo> = {
        pagerduty: {
          actionTypeId: 'pagerduty',
          displayName: 'PagerDuty',
          instances: [
            {
              id: 'pagerduty-prod',
              name: 'Production PagerDuty',
              isPreconfigured: false,
              isDeprecated: false,
            },
          ],
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'gold',
          subActions: [],
        },
      };

      beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock PagerDuty connector schema
        jest
          .mocked(getConnectorWithSchemaModule.getConnectorParamsSchema)
          .mockImplementation((connectorType, _dynamicConnectorTypes) => {
            if (connectorType === 'pagerduty') {
              return {
                event_action: z
                  .enum(['trigger', 'resolve', 'acknowledge'])
                  .describe('Event action type'),
                dedup_key: z.string().optional().describe('Deduplication key for the event'),
                summary: z.string().describe('Summary of the event'),
                source: z.string().optional().describe('Source of the event'),
                severity: z
                  .enum(['critical', 'error', 'warning', 'info'])
                  .optional()
                  .describe('Event severity'),
                timestamp: z.string().optional().describe('ISO 8601 timestamp'),
                component: z.string().optional().describe('Component affected'),
                group: z.string().optional().describe('Logical grouping'),
                class: z.string().optional().describe('Classification of the event'),
                custom_details: z
                  .record(z.any())
                  .optional()
                  .describe('Custom details as key-value pairs'),
              };
            }
            return null;
          });

        // Mock enhanced type info
        jest
          .mocked(generateConnectorSnippetModule.getEnhancedTypeInfo)
          .mockImplementation((schema) => {
            if (schema instanceof z.ZodString) {
              return {
                type: 'string',
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
                example: schema.description?.includes('Summary')
                  ? 'Critical system alert'
                  : undefined,
              };
            } else if (schema instanceof z.ZodEnum) {
              const values = schema._def.values as string[];
              return {
                type: `enum: ${values.join(' | ')}`,
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
                example: values.includes('trigger') ? 'trigger' : values[0],
              };
            } else if (schema instanceof z.ZodRecord) {
              return {
                type: 'object',
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
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

      it('should suggest incident creation parameters', async () => {
        const yamlContent = `
version: "1"
name: "critical-alert"
steps:
  - name: page-oncall
    type: pagerduty
    connector_id: pagerduty-prod
    with:
      |<-
`.trim();

        // Mock PagerDuty suggestions
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'event_action',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'event_action: ${1:trigger}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!event_action',
            detail: 'enum: trigger | resolve | acknowledge (required)',
            documentation: {
              value:
                '**pagerduty Parameter: event_action**\n\n**Type:** `enum: trigger | resolve | acknowledge`\n**Required:** Yes\n\n**Description:** Event action type\n\n**Example:** `trigger`\n\n*This parameter is specific to the pagerduty connector.*',
            },
            preselect: true,
          },
          {
            label: 'summary',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'summary: "${1:Critical system alert}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!summary',
            detail: 'string (required)',
            documentation: {
              value:
                '**pagerduty Parameter: summary**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** Summary of the event\n\n**Example:** `Critical system alert`\n\n*This parameter is specific to the pagerduty connector.*',
            },
            preselect: true,
          },
          {
            label: 'severity',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'severity: ${1:critical}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!severity',
            detail: 'enum: critical | error | warning | info (optional)',
            documentation: {
              value:
                '**pagerduty Parameter: severity**\n\n**Type:** `enum: critical | error | warning | info`\n**Required:** No\n\n**Description:** Event severity\n\n**Example:** `critical`\n\n*This parameter is specific to the pagerduty connector.*',
            },
            preselect: true,
          },
          {
            label: 'dedup_key',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'dedup_key: "${1:}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!dedup_key',
            detail: 'string (optional)',
            documentation: {
              value:
                '**pagerduty Parameter: dedup_key**\n\n**Type:** `string`\n**Required:** No\n\n**Description:** Deduplication key for the event\n\n*This parameter is specific to the pagerduty connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, pagerdutyConnectorType);

        // Verify PagerDuty parameters
        expect(suggestions).toHaveLength(4);
        expect(suggestions.map((s) => s.label)).toEqual([
          'event_action',
          'summary',
          'severity',
          'dedup_key',
        ]);

        // Verify event_action parameter
        expect(suggestions[0].insertText).toBe('event_action: ${1:trigger}');
        expect(suggestions[0].detail).toBe('enum: trigger | resolve | acknowledge (required)');

        // Verify summary parameter
        expect(suggestions[1].insertText).toBe('summary: "${1:Critical system alert}"');
        expect(suggestions[1].detail).toBe('string (required)');

        // Verify severity parameter
        expect(suggestions[2].insertText).toBe('severity: ${1:critical}');
        expect(suggestions[2].detail).toBe('enum: critical | error | warning | info (optional)');
      });

      it('should handle incident resolution workflow', async () => {
        const yamlContent = `
version: "1"
name: "auto-resolve"
steps:
  - name: check-health
    type: elasticsearch.search
    with:
      index: health-*
      size: 1
  - name: resolve-incident
    type: pagerduty
    connector_id: pagerduty-prod
    with:
      event_action: resolve
      dedup_key: "{{ inputs.incident_key }}"
      |<-
`.trim();

        // Mock existing parameters
        jest
          .mocked(getExistingParametersModule.getExistingParametersInWithBlock)
          .mockReturnValue(new Set(['event_action', 'dedup_key']));

        // Mock remaining suggestions
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'summary',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'summary: "${1:Incident resolved}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 15,
              endLineNumber: 15,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!summary',
            detail: 'string (required)',
            documentation: {
              value:
                '**pagerduty Parameter: summary**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** Summary of the event\n\n*This parameter is specific to the pagerduty connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, pagerdutyConnectorType);

        // Should only suggest required parameters not already present
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].label).toBe('summary');
        expect(suggestions[0].insertText).toBe('summary: "${1:Incident resolved}"');
        expect(suggestions[0].detail).toBe('string (required)');
      });
    });

    // Complex multi-step workflow scenarios
    describe('Complex workflow scenarios', () => {
      it('should handle conditional notifications with multiple connectors', async () => {
        const yamlContent = `
version: "1"
name: "smart-alerting"
steps:
  - name: check-severity
    type: elasticsearch.search
    with:
      index: alerts-*
      body:
        query:
          match:
            severity: critical
  - name: notify-critical
    type: if
    with:
      condition: "{{ steps.check-severity.output.hits.total.value > 0 }}"
    steps:
      - name: page-oncall
        type: pagerduty
        connector_id: pagerduty-prod
        with:
          |<-
`.trim();

        // Use the PagerDuty connector type from earlier test
        const pagerdutyConnectorType: Record<string, ConnectorTypeInfo> = {
          pagerduty: {
            actionTypeId: 'pagerduty',
            displayName: 'PagerDuty',
            instances: [
              {
                id: 'pagerduty-prod',
                name: 'Production PagerDuty',
                isPreconfigured: false,
                isDeprecated: false,
              },
            ],
            enabled: true,
            enabledInConfig: true,
            enabledInLicense: true,
            minimumLicenseRequired: 'gold',
            subActions: [],
          },
        };

        // Mock the PagerDuty suggestions in nested if block
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'event_action',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'event_action: ${1:trigger}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 23,
              endLineNumber: 23,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!event_action',
            detail: 'enum: trigger | resolve | acknowledge (required)',
            documentation: {
              value:
                '**pagerduty Parameter: event_action**\n\n**Type:** `enum: trigger | resolve | acknowledge`\n**Required:** Yes\n\n**Description:** Event action type\n\n*This parameter is specific to the pagerduty connector.*',
            },
            preselect: true,
          },
          {
            label: 'summary',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'summary: "${1:Critical alerts detected}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 23,
              endLineNumber: 23,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!summary',
            detail: 'string (required)',
            documentation: {
              value:
                '**pagerduty Parameter: summary**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** Summary of the event\n\n*This parameter is specific to the pagerduty connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, pagerdutyConnectorType);

        // Should suggest PagerDuty parameters even in nested if block
        expect(suggestions).toHaveLength(2);
        expect(suggestions.map((s) => s.label)).toEqual(['event_action', 'summary']);
        expect(suggestions[0].insertText).toBe('event_action: ${1:trigger}');
        expect(suggestions[1].insertText).toBe('summary: "${1:Critical alerts detected}"');
      });

      it('should handle foreach loop with connector actions', async () => {
        const yamlContent = `
version: "1"
name: "bulk-notifications"
steps:
  - name: get-users
    type: elasticsearch.search
    with:
      index: users
      size: 100
  - name: notify-each
    type: foreach
    with:
      items: "{{ steps.get-users.output.hits.hits }}"
    steps:
      - name: send-notification
        type: email
        connector_id: email-service
        with:
          to: ["{{ item._source.email }}"]
          |<-
`.trim();

        // Use the Email connector type from earlier test
        const emailConnectorType: Record<string, ConnectorTypeInfo> = {
          email: {
            actionTypeId: 'email',
            displayName: 'Email',
            instances: [
              {
                id: 'email-service',
                name: 'Company Email Service',
                isPreconfigured: false,
                isDeprecated: false,
              },
            ],
            enabled: true,
            enabledInConfig: true,
            enabledInLicense: true,
            minimumLicenseRequired: 'gold',
            subActions: [],
          },
        };

        // Mock existing parameters (to already has a value)
        jest
          .mocked(getExistingParametersModule.getExistingParametersInWithBlock)
          .mockReturnValue(new Set(['to']));

        // Mock suggestions for remaining email parameters
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'subject',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'subject: "${1:Notification for {{ item._source.name }}}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 18,
              endLineNumber: 18,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!subject',
            detail: 'string (required)',
            documentation: {
              value:
                '**email Parameter: subject**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** Email subject\n\n*This parameter is specific to the email connector.*',
            },
            preselect: true,
          },
          {
            label: 'message',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'message: "${1:}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 18,
              endLineNumber: 18,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!message',
            detail: 'string (required)',
            documentation: {
              value:
                '**email Parameter: message**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** Email message body\n\n*This parameter is specific to the email connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, emailConnectorType);

        // Should suggest remaining email parameters in foreach loop
        expect(suggestions).toHaveLength(2);
        expect(suggestions.map((s) => s.label)).toEqual(['subject', 'message']);
        expect(suggestions[0].insertText).toBe(
          'subject: "${1:Notification for {{ item._source.name }}}"'
        );
        expect(suggestions[1].detail).toBe('string (required)');
      });
    });

    // Edge cases and error scenarios
    describe('Edge cases and error handling', () => {
      it('should handle nested with blocks in complex structures', async () => {
        const yamlContent = `
version: "1"
name: "nested-workflow"
steps:
  - name: outer-step
    type: if
    with:
      condition: true
    steps:
      - name: inner-step
        type: foreach
        with:
          items: ["a", "b", "c"]
        steps:
          - name: deepest-step
            type: slack
            connector_id: slack-bot
            with:
              |<-
`.trim();

        // Use the Slack connector type
        const slackConnectorType: Record<string, ConnectorTypeInfo> = {
          slack: {
            actionTypeId: 'slack',
            displayName: 'Slack',
            instances: [
              {
                id: 'slack-bot',
                name: 'Slack Bot',
                isPreconfigured: false,
                isDeprecated: false,
              },
            ],
            enabled: true,
            enabledInConfig: true,
            enabledInLicense: true,
            minimumLicenseRequired: 'gold',
            subActions: [],
          },
        };

        // Mock suggestions for deeply nested slack connector
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'channel',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'channel: "${1:#general}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 21,
              endLineNumber: 21,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!channel',
            detail: 'string (required)',
            documentation: {
              value:
                '**slack Parameter: channel**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** The Slack channel to post to\n\n*This parameter is specific to the slack connector.*',
            },
            preselect: true,
          },
          {
            label: 'message',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'message: "${1:Item {{ item }}}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 21,
              endLineNumber: 21,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!message',
            detail: 'string (required)',
            documentation: {
              value:
                '**slack Parameter: message**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** The message to send\n\n*This parameter is specific to the slack connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, slackConnectorType);

        // Should work even in deeply nested structures
        expect(suggestions).toHaveLength(2);
        expect(suggestions.map((s) => s.label)).toEqual(['channel', 'message']);
        expect(suggestions[1].insertText).toBe('message: "${1:Item {{ item }}}"');
      });

      it('should handle with block after error handling step', async () => {
        const yamlContent = `
version: "1"
name: "error-handler"
steps:
  - name: risky-operation
    type: webhook
    connector_id: external-api
    with:
      url: "https://api.example.com/risky"
    on_error:
      - name: log-error
        type: console
        with:
          |<-
`.trim();

        // Mock console connector suggestions
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'message',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'message: "${1:Error: {{ error.message }}}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 12,
              endLineNumber: 12,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!message',
            detail: 'string (required)',
            documentation: {
              value:
                '**console Parameter: message**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** Log a message to the workflow logs\n\n*This parameter is specific to the console connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent);

        // Should work in error handler blocks
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].label).toBe('message');
        expect(suggestions[0].insertText).toBe('message: "${1:Error: {{ error.message }}}"');
      });

      it('should handle with block with special characters in values', async () => {
        const yamlContent = `
version: "1"
name: "special-chars"
steps:
  - name: regex-search
    type: elasticsearch.search
    with:
      index: "logs-*"
      body:
        query:
          regexp:
            message: "error\\\\[\\\\d+\\\\]"
      |<-
`.trim();

        const elasticsearchConnectorTypes: Record<string, ConnectorTypeInfo> = {
          'elasticsearch.search': {
            actionTypeId: 'elasticsearch.search',
            displayName: 'Elasticsearch Search',
            instances: [],
            enabled: true,
            enabledInConfig: true,
            enabledInLicense: true,
            minimumLicenseRequired: 'basic',
            subActions: [],
          },
        };

        // Mock existing parameters
        jest
          .mocked(getExistingParametersModule.getExistingParametersInWithBlock)
          .mockReturnValue(new Set(['index', 'body']));

        // Mock remaining suggestions
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'size',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'size: ${1:10}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 12,
              endLineNumber: 12,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!size',
            detail: 'number (optional)',
            documentation: {
              value:
                '**elasticsearch.search Parameter: size**\n\n**Type:** `number`\n**Required:** No\n\n**Description:** Number of results to return\n\n*This parameter is specific to the elasticsearch.search connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, elasticsearchConnectorTypes);

        // Should work even when existing values have special characters
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].label).toBe('size');
        expect(suggestions[0].insertText).toBe('size: ${1:10}');
      });

      it('should handle with block with multiline values', async () => {
        const yamlContent = `
version: "1"
name: "multiline-content"
steps:
  - name: send-formatted-message
    type: slack
    connector_id: slack-main
    with:
      channel: "#alerts"
      message: |
        Alert: System Error Detected
        Time: {{ now }}
        Severity: High
        
        Please investigate immediately.
      |<-
`.trim();

        const slackConnectorType: Record<string, ConnectorTypeInfo> = {
          slack: {
            actionTypeId: 'slack',
            displayName: 'Slack',
            instances: [
              {
                id: 'slack-main',
                name: 'Main Slack',
                isPreconfigured: false,
                isDeprecated: false,
              },
            ],
            enabled: true,
            enabledInConfig: true,
            enabledInLicense: true,
            minimumLicenseRequired: 'gold',
            subActions: [],
          },
        };

        // Mock existing parameters
        jest
          .mocked(getExistingParametersModule.getExistingParametersInWithBlock)
          .mockReturnValue(new Set(['channel', 'message']));

        // Mock remaining suggestions
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'thread_ts',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'thread_ts: "${1:}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 15,
              endLineNumber: 15,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!thread_ts',
            detail: 'string (optional)',
            documentation: {
              value:
                '**slack Parameter: thread_ts**\n\n**Type:** `string`\n**Required:** No\n\n**Description:** Thread timestamp for replies\n\n*This parameter is specific to the slack connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, slackConnectorType);

        // Should work even when existing values are multiline
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].label).toBe('thread_ts');
        expect(suggestions[0].detail).toBe('string (optional)');
      });
    });

    // ServiceNow connector scenarios
    describe('ServiceNow connector real-life scenarios', () => {
      const servicenowConnectorType: Record<string, ConnectorTypeInfo> = {
        servicenow: {
          actionTypeId: 'servicenow',
          displayName: 'ServiceNow',
          instances: [
            {
              id: 'servicenow-prod',
              name: 'Production ServiceNow',
              isPreconfigured: false,
              isDeprecated: false,
            },
          ],
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'platinum',
          subActions: [],
        },
      };

      beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock ServiceNow connector schema
        jest
          .mocked(getConnectorWithSchemaModule.getConnectorParamsSchema)
          .mockImplementation((connectorType, _dynamicConnectorTypes) => {
            if (connectorType === 'servicenow') {
              return {
                short_description: z.string().describe('Short description of the incident'),
                description: z.string().optional().describe('Detailed description'),
                urgency: z
                  .enum(['1', '2', '3'])
                  .optional()
                  .describe('Urgency level (1=High, 2=Medium, 3=Low)'),
                severity: z
                  .enum(['1', '2', '3'])
                  .optional()
                  .describe('Severity level (1=High, 2=Medium, 3=Low)'),
                impact: z
                  .enum(['1', '2', '3'])
                  .optional()
                  .describe('Impact level (1=High, 2=Medium, 3=Low)'),
                category: z.string().optional().describe('Incident category'),
                subcategory: z.string().optional().describe('Incident subcategory'),
                incident_id: z.string().optional().describe('Incident ID for updates'),
                state: z.string().optional().describe('Incident state'),
                work_notes: z.string().optional().describe('Work notes for the incident'),
              };
            }
            return null;
          });

        // Mock enhanced type info
        jest
          .mocked(generateConnectorSnippetModule.getEnhancedTypeInfo)
          .mockImplementation((schema) => {
            if (schema instanceof z.ZodString) {
              return {
                type: 'string',
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
                example: schema.description?.includes('Short description')
                  ? 'System outage detected'
                  : undefined,
              };
            } else if (schema instanceof z.ZodEnum) {
              const values = schema._def.values as string[];
              return {
                type: `enum: ${values.join(' | ')}`,
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
                example: '2',
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

      it('should suggest incident creation parameters', async () => {
        const yamlContent = `
version: "1"
name: "create-incident"
steps:
  - name: create-ticket
    type: servicenow
    connector_id: servicenow-prod
    with:
      |<-
`.trim();

        // Mock ServiceNow suggestions
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'short_description',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'short_description: "${1:System outage detected}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!short_description',
            detail: 'string (required)',
            documentation: {
              value:
                '**servicenow Parameter: short_description**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** Short description of the incident\n\n**Example:** `System outage detected`\n\n*This parameter is specific to the servicenow connector.*',
            },
            preselect: true,
          },
          {
            label: 'urgency',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'urgency: ${1:2}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!urgency',
            detail: 'enum: 1 | 2 | 3 (optional)',
            documentation: {
              value:
                '**servicenow Parameter: urgency**\n\n**Type:** `enum: 1 | 2 | 3`\n**Required:** No\n\n**Description:** Urgency level (1=High, 2=Medium, 3=Low)\n\n**Example:** `2`\n\n*This parameter is specific to the servicenow connector.*',
            },
            preselect: true,
          },
          {
            label: 'impact',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'impact: ${1:2}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!impact',
            detail: 'enum: 1 | 2 | 3 (optional)',
            documentation: {
              value:
                '**servicenow Parameter: impact**\n\n**Type:** `enum: 1 | 2 | 3`\n**Required:** No\n\n**Description:** Impact level (1=High, 2=Medium, 3=Low)\n\n**Example:** `2`\n\n*This parameter is specific to the servicenow connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, servicenowConnectorType);

        // Verify ServiceNow parameters
        expect(suggestions).toHaveLength(3);
        expect(suggestions.map((s) => s.label)).toEqual(['short_description', 'urgency', 'impact']);

        // Verify short_description parameter
        expect(suggestions[0].insertText).toBe('short_description: "${1:System outage detected}"');
        expect(suggestions[0].detail).toBe('string (required)');

        // Verify urgency parameter (enum)
        expect(suggestions[1].insertText).toBe('urgency: ${1:2}');
        expect(suggestions[1].detail).toBe('enum: 1 | 2 | 3 (optional)');
      });

      it('should handle ticket update workflow', async () => {
        const yamlContent = `
version: "1"
name: "update-ticket"
steps:
  - name: update-incident
    type: servicenow
    connector_id: servicenow-prod
    with:
      incident_id: "{{ inputs.ticket_id }}"
      state: "In Progress"
      work_notes: "Automated update from workflow"
      |<-
`.trim();

        // Mock existing parameters
        jest
          .mocked(getExistingParametersModule.getExistingParametersInWithBlock)
          .mockReturnValue(new Set(['incident_id', 'state', 'work_notes']));

        // Mock remaining suggestions
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'urgency',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'urgency: ${1:1}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 11,
              endLineNumber: 11,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!urgency',
            detail: 'enum: 1 | 2 | 3 (optional)',
            documentation: {
              value:
                '**servicenow Parameter: urgency**\n\n**Type:** `enum: 1 | 2 | 3`\n**Required:** No\n\n**Description:** Urgency level (1=High, 2=Medium, 3=Low)\n\n*This parameter is specific to the servicenow connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, servicenowConnectorType);

        // Should suggest additional update parameters
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].label).toBe('urgency');
        expect(suggestions[0].insertText).toBe('urgency: ${1:1}');
      });
    });

    // Jira connector scenarios
    describe('Jira connector real-life scenarios', () => {
      const jiraConnectorType: Record<string, ConnectorTypeInfo> = {
        jira: {
          actionTypeId: 'jira',
          displayName: 'Jira',
          instances: [
            {
              id: 'jira-cloud',
              name: 'Jira Cloud',
              isPreconfigured: false,
              isDeprecated: false,
            },
          ],
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'gold',
          subActions: [],
        },
      };

      beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock Jira connector schema
        jest
          .mocked(getConnectorWithSchemaModule.getConnectorParamsSchema)
          .mockImplementation((connectorType, _dynamicConnectorTypes) => {
            if (connectorType === 'jira') {
              return {
                summary: z.string().describe('Issue summary'),
                description: z.string().optional().describe('Issue description'),
                issue_type: z.string().describe('Issue type (Bug, Task, Story)'),
                project_key: z.string().describe('Project key'),
                priority: z
                  .string()
                  .optional()
                  .describe('Priority (Highest, High, Medium, Low, Lowest)'),
                labels: z.array(z.string()).optional().describe('Labels for the issue'),
                issue_key: z.string().optional().describe('Issue key for updates'),
                transition: z.string().optional().describe('Transition name'),
                comment: z.string().optional().describe('Comment to add'),
              };
            }
            return null;
          });

        // Mock enhanced type info
        jest
          .mocked(generateConnectorSnippetModule.getEnhancedTypeInfo)
          .mockImplementation((schema) => {
            if (schema instanceof z.ZodString) {
              return {
                type: 'string',
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
                example: schema.description?.includes('summary')
                  ? 'Fix critical bug in authentication'
                  : schema.description?.includes('Project key')
                  ? 'PROJ'
                  : schema.description?.includes('Issue type')
                  ? 'Bug'
                  : undefined,
              };
            } else if (schema instanceof z.ZodArray) {
              return {
                type: 'string[]',
                isRequired: !schema.isOptional(),
                isOptional: schema.isOptional(),
                description: schema.description,
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

      it('should suggest issue creation parameters', async () => {
        const yamlContent = `
version: "1"
name: "bug-tracker"
steps:
  - name: create-bug
    type: jira
    connector_id: jira-cloud
    with:
      |<-
`.trim();

        // Mock Jira suggestions
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([
          {
            label: 'project_key',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'project_key: "${1:PROJ}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!project_key',
            detail: 'string (required)',
            documentation: {
              value:
                '**jira Parameter: project_key**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** Project key\n\n**Example:** `PROJ`\n\n*This parameter is specific to the jira connector.*',
            },
            preselect: true,
          },
          {
            label: 'issue_type',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'issue_type: "${1:Bug}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!issue_type',
            detail: 'string (required)',
            documentation: {
              value:
                '**jira Parameter: issue_type**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** Issue type (Bug, Task, Story)\n\n**Example:** `Bug`\n\n*This parameter is specific to the jira connector.*',
            },
            preselect: true,
          },
          {
            label: 'summary',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'summary: "${1:Fix critical bug in authentication}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!summary',
            detail: 'string (required)',
            documentation: {
              value:
                '**jira Parameter: summary**\n\n**Type:** `string`\n**Required:** Yes\n\n**Description:** Issue summary\n\n**Example:** `Fix critical bug in authentication`\n\n*This parameter is specific to the jira connector.*',
            },
            preselect: true,
          },
          {
            label: 'labels',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'labels:\n  - "${1:}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: 7,
              endLineNumber: 7,
              startColumn: 1,
              endColumn: 100,
            },
            sortText: '!labels',
            detail: 'string[] (optional)',
            documentation: {
              value:
                '**jira Parameter: labels**\n\n**Type:** `string[]`\n**Required:** No\n\n**Description:** Labels for the issue\n\n*This parameter is specific to the jira connector.*',
            },
            preselect: true,
          },
        ]);

        const suggestions = await getSuggestions(yamlContent, jiraConnectorType);

        // Verify Jira parameters
        expect(suggestions).toHaveLength(4);
        expect(suggestions.map((s) => s.label)).toEqual([
          'project_key',
          'issue_type',
          'summary',
          'labels',
        ]);

        // Verify project_key parameter
        expect(suggestions[0].insertText).toBe('project_key: "${1:PROJ}"');
        expect(suggestions[0].detail).toBe('string (required)');

        // Verify issue_type parameter
        expect(suggestions[1].insertText).toBe('issue_type: "${1:Bug}"');

        // Verify labels parameter (array)
        expect(suggestions[3].insertText).toBe('labels:\n  - "${1:}"');
        expect(suggestions[3].detail).toBe('string[] (optional)');
      });

      it('should handle issue transition workflow', async () => {
        const yamlContent = `
version: "1"
name: "close-resolved-issues"
steps:
  - name: transition-issue
    type: jira
    connector_id: jira-cloud
    with:
      issue_key: "{{ inputs.issue_key }}"
      transition: "Done"
      comment: "Automatically closed by workflow"
      |<-
`.trim();

        // Mock existing parameters
        jest
          .mocked(getExistingParametersModule.getExistingParametersInWithBlock)
          .mockReturnValue(new Set(['issue_key', 'transition', 'comment']));

        // Mock remaining suggestions - no required parameters left
        jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([]);

        const suggestions = await getSuggestions(yamlContent, jiraConnectorType);

        // All parameters already provided
        expect(suggestions).toHaveLength(0);
      });
    });
  });
});
