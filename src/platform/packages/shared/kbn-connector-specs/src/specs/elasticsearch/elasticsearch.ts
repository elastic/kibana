/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import { UISchemas } from '../../connector_spec_ui';
import { callEsApi } from './elasticsearch_api';
import {
  EsqlInputSchema,
  GetClusterInfoInputSchema,
  GetMappingInputSchema,
  ListIndicesInputSchema,
  RequestInputSchema,
  SearchInputSchema,
  type EsqlInput,
  type GetMappingInput,
  type ListIndicesInput,
  type RequestInput,
  type SearchInput,
} from './types';

export const Elasticsearch: ConnectorSpec = {
  metadata: {
    id: '.elasticsearch',
    displayName: 'External Elasticsearch',
    description: i18n.translate('core.kibanaConnectorSpecs.elasticsearch.metadata.description', {
      defaultMessage:
        'Search and explore data on a remote Elasticsearch cluster, retrieve mappings and aliases, and run ES|QL queries',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    // A new connector type must reach Production-NonCanary before it can declare
    // user-facing features. Ship ['agentBuilder'] first, then add 'workflows'
    // and others in a follow-up PR.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'api_key_header',
        isRecommended: true,
        defaults: { headerField: 'Authorization' },
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.elasticsearch.auth.apiKeyHeader.label', {
            defaultMessage: 'Elasticsearch API key',
          }),
          meta: {
            headerField: { hidden: true },
            apiKey: {
              label: i18n.translate('core.kibanaConnectorSpecs.elasticsearch.auth.apiKey.label', {
                defaultMessage: 'API Key',
              }),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.elasticsearch.auth.apiKey.helpText',
                {
                  defaultMessage:
                    'Enter "ApiKey encoded" where encoded is the base64-encoded "id:api_key" value from the Elasticsearch create API key response (POST /_security/api_key). Grant the key at minimum: read on the indices you search.',
                }
              ),
            },
          },
        },
      },
      {
        type: 'basic',
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.elasticsearch.auth.basic.label', {
            defaultMessage: 'Username and password',
          }),
          meta: {
            password: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.elasticsearch.auth.basic.password.helpText',
                {
                  defaultMessage:
                    'The user must have at minimum: read privilege on the indices you search.',
                }
              ),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      url: UISchemas.url('https://my-cluster.es.us-east-1.aws.elastic.cloud')
        .describe(
          'The Elasticsearch cluster endpoint URL. For Elastic Cloud, use the Elasticsearch endpoint shown in your deployment (e.g. https://my-deployment.es.us-east-1.aws.elastic.cloud). For self-managed clusters, use the full URL including port, e.g. https://elasticsearch.example.com:9200.'
        )
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.elasticsearch.config.url.label', {
            defaultMessage: 'Elasticsearch URL',
          }),
        }),
    })
  ),

  validateUrls: { fields: ['url'] },

  actions: {
    search: {
      isTool: true,
      description:
        'Search documents in one or more Elasticsearch indices using the Query DSL. Returns matching hits with source, score, and metadata. Supports aggregations, sorting, field filtering, and pagination. Use listIndices first if you do not know the index name, and getMapping to understand available fields.',
      input: SearchInputSchema,
      handler: async (ctx, input: SearchInput) => {
        const indexParam = Array.isArray(input.index) ? input.index.join(',') : input.index;
        const body: Record<string, unknown> = {
          query: input.query,
          size: input.size,
          from: input.from,
          timeout: input.timeout,
        };
        if (input.sort) body.sort = input.sort;
        if (input._source !== undefined) body._source = input._source;
        if (input.aggs) body.aggs = input.aggs;
        if (input.runtimeMappings) body.runtime_mappings = input.runtimeMappings;
        return callEsApi(ctx, 'POST', `/${encodeURIComponent(indexParam)}/_search`, { body });
      },
    },

    esql: {
      isTool: true,
      description:
        'Run an ES|QL query against Elasticsearch. ES|QL is a pipe-based query language optimized for analytics, aggregations, and time-series exploration (requires Elasticsearch 8.11+). Returns a columnar result set with column names and row values. Use this for analytics; use search for full-text search or Query DSL.',
      input: EsqlInputSchema,
      handler: async (ctx, input: EsqlInput) => {
        const body: Record<string, unknown> = { query: input.query };
        if (input.dropNullColumns) body.drop_null_columns = true;
        if (input.params) body.params = input.params;
        if (input.filter) body.filter = input.filter;
        if (input.locale) body.locale = input.locale;
        return callEsApi(ctx, 'POST', '/_query', { body });
      },
    },

    listIndices: {
      isTool: true,
      description:
        'List indices and data streams with their health, status, document count, and storage size. Optionally filter by name pattern. Use this to discover available indices before calling search, getMapping, or esql.',
      input: ListIndicesInputSchema,
      handler: async (ctx, input: ListIndicesInput) => {
        const path =
          input.pattern !== '*'
            ? `/_cat/indices/${encodeURIComponent(input.pattern)}`
            : '/_cat/indices';
        const params: Record<string, unknown> = {
          format: 'json',
          h: 'health,status,index,docs.count,store.size',
        };
        if (input.includeHidden) params.expand_wildcards = 'all';
        return callEsApi(ctx, 'GET', path, { params });
      },
    },

    getMapping: {
      isTool: true,
      description:
        'Retrieve the field mapping for an index using the _field_caps API. Returns field names, types, and whether each field is searchable and aggregatable. Use this to understand available fields before constructing a search query or ES|QL query against an unfamiliar index.',
      input: GetMappingInputSchema,
      handler: async (ctx, input: GetMappingInput) => {
        const fieldsParam = input.fields.join(',');
        return callEsApi(ctx, 'GET', `/${encodeURIComponent(input.index)}/_field_caps`, {
          params: { fields: fieldsParam },
        });
      },
    },

    request: {
      isTool: true,
      description:
        'Make an arbitrary GET request to the Elasticsearch REST API. Use this as an escape hatch when no typed action covers the endpoint you need (e.g. GET /_cluster/settings, GET /_aliases, GET /_nodes). The base cluster URL is prepended automatically — only provide the path.',
      input: RequestInputSchema,
      handler: async (ctx, input: RequestInput) => {
        return callEsApi(ctx, 'GET', input.path, {
          params: input.queryParams as Record<string, unknown> | undefined,
        });
      },
    },

    getClusterInfo: {
      isTool: true,
      description:
        'Get basic information about the Elasticsearch cluster: name, version, and build information. Use getClusterHealth (via the request action: GET /_cluster/health) to check shard/node counts and cluster status.',
      input: GetClusterInfoInputSchema,
      handler: async (ctx) => {
        return callEsApi(ctx, 'GET', '/');
      },
    },
  },

  skill: [
    '## External Elasticsearch Connector',
    '',
    'Use this connector to query and explore data on a remote Elasticsearch cluster.',
    '',
    '### Discovery workflow',
    '- Call `listIndices` (optionally with a pattern like "logs-*") to find available indices.',
    '- Call `getMapping` on an index to learn its field names and types before constructing a query.',
    '- To list aliases: use the `request` action with path "/_alias".',
    '- To check cluster health: use the `request` action with path "/_cluster/health".',
    '',
    '### Searching',
    '- Use `search` for full-text search, term filters, or any Query DSL — pass the full query body in the "query" parameter.',
    '  Example: { "query": { "match": { "message": "error" } }, "size": 20, "sort": [{ "@timestamp": { "order": "desc" } }] }',
    '- Use `esql` for analytics and aggregations with the pipe-based ES|QL language (requires ES 8.11+).',
    '  Example: FROM logs-* | WHERE @timestamp > NOW() - 1 hour | STATS count = COUNT(*) BY service.name | SORT count DESC | LIMIT 10',
    '',
    '### Auth notes',
    '- API key auth is recommended. Enter the full "ApiKey encoded" value from the Elasticsearch create API key response (POST /_security/api_key).',
    '- The key must be granted read privilege on the indices you search.',
    '- For Elastic Cloud deployments, use the Elasticsearch endpoint URL shown in the Cloud console.',
  ].join('\n'),

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.elasticsearch.test.description', {
      defaultMessage: 'Verifies the connection by fetching cluster information',
    }),
    handler: async (ctx) => {
      const info = await callEsApi<{
        name?: string;
        version?: { number?: string };
        cluster_name?: string;
      }>(ctx, 'GET', '/');
      return {
        message: `Successfully connected to Elasticsearch cluster "${
          info.cluster_name ?? info.name
        }" (version: ${info.version?.number ?? 'unknown'}).`,
      };
    },
  },
};
