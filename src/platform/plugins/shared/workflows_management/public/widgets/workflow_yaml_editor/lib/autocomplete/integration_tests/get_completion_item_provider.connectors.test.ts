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

describe('getCompletionItemProvider - Additional connector scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(getExistingParametersModule.getExistingParametersInWithBlock)
      .mockReturnValue(new Set());
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
});
