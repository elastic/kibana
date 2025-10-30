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
import * as generateConnectorSnippetModule from '../../snippets/generate_connector_snippet';
import { getFakeAutocompleteContextParams } from '../context/build_autocomplete_context.test';
import { getCompletionItemProvider } from '../get_completion_item_provider';
import * as getConnectorWithSchemaModule from '../suggestions/connector_with/get_connector_with_schema';
import * as getExistingParametersModule from '../suggestions/connector_with/get_existing_parameters_in_with_block';
import * as getWithBlockSuggestionsModule from '../suggestions/connector_with/get_with_block_suggestions';

// Mock the modules
jest.mock('../suggestions/connector_with/get_with_block_suggestions');
jest.mock('../suggestions/connector_with/get_connector_with_schema');
jest.mock('../suggestions/connector_with/get_existing_parameters_in_with_block');
jest.mock('../../snippets/generate_connector_snippet');

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

describe('getCompletionItemProvider - Workflows and edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(getExistingParametersModule.getExistingParametersInWithBlock)
      .mockReturnValue(new Set());
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

  // Complex workflow scenarios
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

  // Edge cases and error handling
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
});
