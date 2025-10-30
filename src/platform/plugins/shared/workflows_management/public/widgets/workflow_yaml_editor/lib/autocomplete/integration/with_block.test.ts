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
import * as getExistingParametersModule from '../suggestions/connector_with/get_existing_parameters_in_with_block';
import * as getWithBlockSuggestionsModule from '../suggestions/connector_with/get_with_block_suggestions';

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

describe('getCompletionItemProvider - With block suggestions', () => {
  describe('Basic with block functionality', () => {
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

      const suggestions = await getSuggestions(yamlContent);

      // Without dynamic connector types, we expect no suggestions
      expect(suggestions).toEqual([]);
      expect(getWithBlockSuggestionsModule.getWithBlockSuggestions).toHaveBeenCalled();
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

      const suggestions = await getSuggestions(yamlContent);

      // Should not provide parameter suggestions when typing a value
      expect(suggestions).toEqual([]);
    });
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

    // beforeEach(() => {
    //   // Mock Email connector schema
    //   jest
    //     .mocked(getConnectorWithSchemaModule.getConnectorParamsSchema)
    //     .mockImplementation((connectorType, _dynamicConnectorTypes) => {
    //       if (connectorType === 'email') {
    //         return {
    //           to: z.array(z.string()).describe('Recipients email addresses'),
    //           cc: z.array(z.string()).optional().describe('CC recipients'),
    //           bcc: z.array(z.string()).optional().describe('BCC recipients'),
    //           subject: z.string().describe('Email subject'),
    //           message: z.string().describe('Email message body'),
    //           messageHTML: z.string().optional().describe('HTML version of the message'),
    //         };
    //       }
    //       return null;
    //     });

    //   // Mock enhanced type info
    //   jest
    //     .mocked(generateConnectorSnippetModule.getEnhancedTypeInfo)
    //     .mockImplementation((schema) => {
    //       if (schema instanceof z.ZodArray) {
    //         return {
    //           type: 'string[]',
    //           isRequired: !schema.isOptional(),
    //           isOptional: schema.isOptional(),
    //           description: schema.description,
    //           example: undefined,
    //         };
    //       } else if (schema instanceof z.ZodString) {
    //         return {
    //           type: 'string',
    //           isRequired: !schema.isOptional(),
    //           isOptional: schema.isOptional(),
    //           description: schema.description,
    //           example: schema.description?.includes('subject') ? 'Alert: System Error' : undefined,
    //         };
    //       }
    //       return {
    //         type: 'unknown',
    //         isRequired: false,
    //         isOptional: true,
    //         description: undefined,
    //         example: undefined,
    //       };
    //     });
    // });

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
});
