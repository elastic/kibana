/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 *
 * This file contains Elasticsearch connector definitions generated from Console's API specifications.
 * Generated at: 2025-09-10T11:02:40.836Z
 * Source: Console definitions (568 APIs)
 *
 * To regenerate: npm run generate:es-connectors
 */

import { z } from '@kbn/zod';
import type { InternalConnectorContract } from '..';

export const GENERATED_ELASTICSEARCH_CONNECTORS: InternalConnectorContract[] = [
  {
    type: 'elasticsearch._internal.delete_desired_balance',
    connectorIdRequired: false,
    description: 'DELETE _internal/desired_balance - 0 parameters',
    methods: ['DELETE'],
    patterns: ['_internal/desired_balance'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/delete-desired-balance.html',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from _internal.delete_desired_balance API'),
  },
  {
    type: 'elasticsearch._internal.delete_desired_nodes',
    connectorIdRequired: false,
    description: 'DELETE _internal/desired_nodes - 0 parameters',
    methods: ['DELETE'],
    patterns: ['_internal/desired_nodes'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/delete-desired-nodes.html',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from _internal.delete_desired_nodes API'),
  },
  {
    type: 'elasticsearch._internal.get_desired_balance',
    connectorIdRequired: false,
    description: 'GET _internal/desired_balance - 0 parameters',
    methods: ['GET'],
    patterns: ['_internal/desired_balance'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/get-desired-balance.html',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from _internal.get_desired_balance API'),
  },
  {
    type: 'elasticsearch._internal.get_desired_nodes',
    connectorIdRequired: false,
    description: 'GET _internal/desired_nodes/_latest - 0 parameters',
    methods: ['GET'],
    patterns: ['_internal/desired_nodes/_latest'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/get-desired-nodes.html',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from _internal.get_desired_nodes API'),
  },
  {
    type: 'elasticsearch._internal.prevalidate_node_removal',
    connectorIdRequired: false,
    description: 'POST _internal/prevalidate_node_removal - 0 parameters',
    methods: ['POST'],
    patterns: ['_internal/prevalidate_node_removal'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/prevalidate-node-removal-api.html',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from _internal.prevalidate_node_removal API'),
  },
  {
    type: 'elasticsearch._internal.update_desired_nodes',
    connectorIdRequired: false,
    description: 'PUT _internal/desired_nodes/{history_id}/{version} - 0 parameters',
    methods: ['PUT'],
    patterns: ['_internal/desired_nodes/{history_id}/{version}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/update-desired-nodes.html',
    parameterTypes: {
      pathParams: ['history_id', 'version'],
      urlParams: [],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      history_id: z.string().describe('Path parameter: history_id (required)'),
      version: z.string().describe('Path parameter: version (required)'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from _internal.update_desired_nodes API'),
  },
  {
    type: 'elasticsearch.async_search.delete',
    connectorIdRequired: false,
    description: 'DELETE _async_search/{id} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_async_search/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-async-search-submit',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from async_search.delete API'),
  },
  {
    type: 'elasticsearch.async_search.get',
    connectorIdRequired: false,
    description: 'GET _async_search/{id} - 7 parameters',
    methods: ['GET'],
    patterns: ['_async_search/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-async-search-submit',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'keep_alive',
        'typed_keys',
        'wait_for_completion_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      keep_alive: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: keep_alive'),
      typed_keys: z.boolean().optional().describe('Boolean flag: typed_keys'),
      wait_for_completion_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: wait_for_completion_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from async_search.get API'),
  },
  {
    type: 'elasticsearch.async_search.status',
    connectorIdRequired: false,
    description: 'GET _async_search/status/{id} - 5 parameters',
    methods: ['GET'],
    patterns: ['_async_search/status/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-async-search-submit',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'keep_alive'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      keep_alive: z.enum(['5d', '-1', '0']).optional().describe('Enum parameter: keep_alive'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from async_search.status API'),
  },
  {
    type: 'elasticsearch.async_search.submit',
    connectorIdRequired: false,
    description: 'POST _async_search | {index}/_async_search - 47 parameters',
    methods: ['POST'],
    patterns: ['_async_search', '{index}/_async_search'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-async-search-submit',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'wait_for_completion_timeout',
        'keep_alive',
        'keep_on_completion',
        'allow_no_indices',
        'allow_partial_search_results',
        'analyzer',
        'analyze_wildcard',
        'batched_reduce_size',
        'ccs_minimize_roundtrips',
        'default_operator',
        'df',
        'docvalue_fields',
        'expand_wildcards',
        'explain',
        'ignore_throttled',
        'ignore_unavailable',
        'lenient',
        'max_concurrent_shard_requests',
        'preference',
        'request_cache',
        'routing',
        'search_type',
        'stats',
        'stored_fields',
        'suggest_field',
        'suggest_mode',
        'suggest_size',
        'suggest_text',
        'terminate_after',
        'timeout',
        'track_total_hits',
        'track_scores',
        'typed_keys',
        'rest_total_hits_as_int',
        'version',
        '_source',
        '_source_excludes',
        '_source_includes',
        'seq_no_primary_term',
        'q',
        'size',
        'from',
        'sort',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      wait_for_completion_timeout: z
        .enum(['1s', '-1', '0'])
        .optional()
        .describe('Enum parameter: wait_for_completion_timeout'),
      keep_alive: z.enum(['5d', '-1', '0']).optional().describe('Enum parameter: keep_alive'),
      keep_on_completion: z.boolean().optional().describe('Boolean flag: keep_on_completion'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      allow_partial_search_results: z
        .boolean()
        .optional()
        .describe('Boolean flag: allow_partial_search_results'),
      analyzer: z.union([z.string(), z.number()]).optional().describe('Parameter: analyzer'),
      analyze_wildcard: z.boolean().optional().describe('Boolean flag: analyze_wildcard'),
      batched_reduce_size: z
        .union([z.number(), z.array(z.number()), z.enum(['5'])])
        .optional()
        .describe('Numeric parameter: batched_reduce_size'),
      ccs_minimize_roundtrips: z
        .boolean()
        .optional()
        .describe('Boolean flag: ccs_minimize_roundtrips'),
      default_operator: z
        .enum(['and', 'or'])
        .optional()
        .describe('Enum parameter: default_operator'),
      df: z.union([z.string(), z.number()]).optional().describe('Parameter: df'),
      docvalue_fields: z.array(z.string()).optional().describe('Array parameter: docvalue_fields'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      explain: z.boolean().optional().describe('Boolean flag: explain'),
      ignore_throttled: z.boolean().optional().describe('Boolean flag: ignore_throttled'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      lenient: z.boolean().optional().describe('Boolean flag: lenient'),
      max_concurrent_shard_requests: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: max_concurrent_shard_requests'),
      preference: z.union([z.string(), z.number()]).optional().describe('Parameter: preference'),
      request_cache: z.boolean().optional().describe('Boolean flag: request_cache'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      search_type: z
        .enum(['query_then_fetch', 'dfs_query_then_fetch'])
        .optional()
        .describe('Enum parameter: search_type'),
      stats: z.union([z.string(), z.number()]).optional().describe('Parameter: stats'),
      stored_fields: z.array(z.string()).optional().describe('Array parameter: stored_fields'),
      suggest_field: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: suggest_field'),
      suggest_mode: z
        .enum(['missing', 'popular', 'always'])
        .optional()
        .describe('Enum parameter: suggest_mode'),
      suggest_size: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: suggest_size'),
      suggest_text: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: suggest_text'),
      terminate_after: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: terminate_after'),
      timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: timeout'),
      track_total_hits: z.boolean().optional().describe('Boolean flag: track_total_hits'),
      track_scores: z.boolean().optional().describe('Boolean flag: track_scores'),
      typed_keys: z.boolean().optional().describe('Boolean flag: typed_keys'),
      rest_total_hits_as_int: z
        .boolean()
        .optional()
        .describe('Boolean flag: rest_total_hits_as_int'),
      version: z.boolean().optional().describe('Boolean flag: version'),
      _source: z.boolean().optional().describe('Boolean flag: _source'),
      _source_excludes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_excludes'),
      _source_includes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_includes'),
      seq_no_primary_term: z.boolean().optional().describe('Boolean flag: seq_no_primary_term'),
      q: z.union([z.string(), z.number()]).optional().describe('Parameter: q'),
      size: z.union([z.string(), z.number()]).optional().describe('Parameter: size'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      sort: z.array(z.string()).optional().describe('Array parameter: sort'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from async_search.submit API'),
  },
  {
    type: 'elasticsearch.autoscaling.delete_autoscaling_policy',
    connectorIdRequired: false,
    description: 'DELETE _autoscaling/policy/{name} - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_autoscaling/policy/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-autoscaling-delete-autoscaling-policy',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from autoscaling.delete_autoscaling_policy API'),
  },
  {
    type: 'elasticsearch.autoscaling.get_autoscaling_capacity',
    connectorIdRequired: false,
    description: 'GET _autoscaling/capacity - 5 parameters',
    methods: ['GET'],
    patterns: ['_autoscaling/capacity'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-autoscaling-get-autoscaling-capacity',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from autoscaling.get_autoscaling_capacity API'),
  },
  {
    type: 'elasticsearch.autoscaling.get_autoscaling_policy',
    connectorIdRequired: false,
    description: 'GET _autoscaling/policy/{name} - 5 parameters',
    methods: ['GET'],
    patterns: ['_autoscaling/policy/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-autoscaling-get-autoscaling-capacity',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from autoscaling.get_autoscaling_policy API'),
  },
  {
    type: 'elasticsearch.autoscaling.put_autoscaling_policy',
    connectorIdRequired: false,
    description: 'PUT _autoscaling/policy/{name} - 6 parameters',
    methods: ['PUT'],
    patterns: ['_autoscaling/policy/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-autoscaling-put-autoscaling-policy',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from autoscaling.put_autoscaling_policy API'),
  },
  {
    type: 'elasticsearch.bulk',
    connectorIdRequired: false,
    description: 'POST/PUT _bulk | {index}/_bulk - 16 parameters',
    methods: ['POST', 'PUT'],
    patterns: ['_bulk', '{index}/_bulk'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'include_source_on_error',
        'list_executed_pipelines',
        'pipeline',
        'refresh',
        'routing',
        '_source',
        '_source_excludes',
        '_source_includes',
        'timeout',
        'wait_for_active_shards',
        'require_alias',
        'require_data_stream',
      ],
      bodyParams: ['operations'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      include_source_on_error: z
        .boolean()
        .optional()
        .describe('Boolean flag: include_source_on_error'),
      list_executed_pipelines: z
        .boolean()
        .optional()
        .describe('Boolean flag: list_executed_pipelines'),
      pipeline: z.union([z.string(), z.number()]).optional().describe('Parameter: pipeline'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      _source: z.boolean().optional().describe('Boolean flag: _source'),
      _source_excludes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_excludes'),
      _source_includes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_includes'),
      timeout: z.enum(['1m', '-1', '0']).optional().describe('Enum parameter: timeout'),
      wait_for_active_shards: z
        .enum(['1', 'all', 'index-setting'])
        .optional()
        .describe('Enum parameter: wait_for_active_shards'),
      require_alias: z.boolean().optional().describe('Boolean flag: require_alias'),
      require_data_stream: z.boolean().optional().describe('Boolean flag: require_data_stream'),
      operations: z.array(z.object({}).passthrough()).optional().describe('Bulk operations'),
    }),
    outputSchema: z.any().describe('Response from bulk API'),
  },
  {
    type: 'elasticsearch.capabilities',
    connectorIdRequired: false,
    description: 'GET _capabilities - 0 parameters',
    methods: ['GET'],
    patterns: ['_capabilities'],
    isInternal: true,
    documentation:
      'https://github.com/elastic/elasticsearch/blob/main/rest-api-spec/src/yamlRestTest/resources/rest-api-spec/test/README.asciidoc#require-or-skip-api-capabilities',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from capabilities API'),
  },
  {
    type: 'elasticsearch.cat.aliases',
    connectorIdRequired: false,
    description: 'GET _cat/aliases | _cat/aliases/{name} - 11 parameters',
    methods: ['GET'],
    patterns: ['_cat/aliases', '_cat/aliases/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-aliases',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'h',
        's',
        'expand_wildcards',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      h: z.array(z.string()).optional().describe('Array parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.aliases API'),
  },
  {
    type: 'elasticsearch.cat.allocation',
    connectorIdRequired: false,
    description: 'GET _cat/allocation | _cat/allocation/{node_id} - 12 parameters',
    methods: ['GET'],
    patterns: ['_cat/allocation', '_cat/allocation/{node_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-allocation',
    parameterTypes: {
      pathParams: ['node_id'],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'bytes',
        'h',
        's',
        'local',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      node_id: z.string().describe('Path parameter: node_id (required)'),
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      bytes: z
        .enum(['b', 'kb', 'mb', 'gb', 'tb', 'pb'])
        .optional()
        .describe('Enum parameter: bytes'),
      h: z.array(z.string()).optional().describe('Array parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.allocation API'),
  },
  {
    type: 'elasticsearch.cat.component_templates',
    connectorIdRequired: false,
    description: 'GET _cat/component_templates | _cat/component_templates/{name} - 11 parameters',
    methods: ['GET'],
    patterns: ['_cat/component_templates', '_cat/component_templates/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-component-templates',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'h',
        's',
        'local',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      h: z.array(z.string()).optional().describe('Array parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.component_templates API'),
  },
  {
    type: 'elasticsearch.cat.count',
    connectorIdRequired: false,
    description: 'GET _cat/count | _cat/count/{index} - 9 parameters',
    methods: ['GET'],
    patterns: ['_cat/count', '_cat/count/{index}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-count',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['format', 'help', 'v', 'error_trace', 'filter_path', 'human', 'pretty', 'h', 's'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      h: z.array(z.string()).optional().describe('Array parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.count API'),
  },
  {
    type: 'elasticsearch.cat.fielddata',
    connectorIdRequired: false,
    description: 'GET _cat/fielddata | _cat/fielddata/{fields} - 11 parameters',
    methods: ['GET'],
    patterns: ['_cat/fielddata', '_cat/fielddata/{fields}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-fielddata',
    parameterTypes: {
      pathParams: ['fields'],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'bytes',
        'fields',
        'h',
        's',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      fields: z.string().describe('Path parameter: fields (required)'),
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      bytes: z
        .enum(['b', 'kb', 'mb', 'gb', 'tb', 'pb'])
        .optional()
        .describe('Enum parameter: bytes'),
      h: z.array(z.string()).optional().describe('Array parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.fielddata API'),
  },
  {
    type: 'elasticsearch.cat.health',
    connectorIdRequired: false,
    description: 'GET _cat/health - 11 parameters',
    methods: ['GET'],
    patterns: ['_cat/health'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-health',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'time',
        'ts',
        'h',
        's',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      time: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: time'),
      ts: z.boolean().optional().describe('Boolean flag: ts'),
      h: z.array(z.string()).optional().describe('Array parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.health API'),
  },
  {
    type: 'elasticsearch.cat.help',
    connectorIdRequired: false,
    description: 'GET _cat - 0 parameters',
    methods: ['GET'],
    patterns: ['_cat'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-cat',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.help API'),
  },
  {
    type: 'elasticsearch.cat.indices',
    connectorIdRequired: false,
    description: 'GET _cat/indices | _cat/indices/{index} - 16 parameters',
    methods: ['GET'],
    patterns: ['_cat/indices', '_cat/indices/{index}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-indices',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'bytes',
        'expand_wildcards',
        'health',
        'include_unloaded_segments',
        'pri',
        'time',
        'master_timeout',
        'h',
        's',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      bytes: z
        .enum(['b', 'kb', 'mb', 'gb', 'tb', 'pb'])
        .optional()
        .describe('Enum parameter: bytes'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      health: z.enum(['green', 'yellow', 'red']).optional().describe('Enum parameter: health'),
      include_unloaded_segments: z
        .boolean()
        .optional()
        .describe('Boolean flag: include_unloaded_segments'),
      pri: z.boolean().optional().describe('Boolean flag: pri'),
      time: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: time'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      h: z.array(z.string()).optional().describe('Array parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.indices API'),
  },
  {
    type: 'elasticsearch.cat.master',
    connectorIdRequired: false,
    description: 'GET _cat/master - 11 parameters',
    methods: ['GET'],
    patterns: ['_cat/master'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-master',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'h',
        's',
        'local',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      h: z.array(z.string()).optional().describe('Array parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.master API'),
  },
  {
    type: 'elasticsearch.cat.ml_data_frame_analytics',
    connectorIdRequired: false,
    description:
      'GET _cat/ml/data_frame/analytics | _cat/ml/data_frame/analytics/{id} - 12 parameters',
    methods: ['GET'],
    patterns: ['_cat/ml/data_frame/analytics', '_cat/ml/data_frame/analytics/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-ml-data-frame-analytics',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_match',
        'bytes',
        'h',
        's',
        'time',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      bytes: z
        .enum(['b', 'kb', 'mb', 'gb', 'tb', 'pb'])
        .optional()
        .describe('Enum parameter: bytes'),
      h: z
        .enum([
          'assignment_explanation',
          'create_time',
          'description',
          'dest_index',
          'failure_reason',
          'id',
          'model_memory_limit',
          'node.address',
          'node.ephemeral_id',
          'node.id',
          'node.name',
          'progress',
          'source_index',
          'state',
          'type',
          'version',
        ])
        .optional()
        .describe('Enum parameter: h'),
      s: z
        .enum([
          'assignment_explanation',
          'create_time',
          'description',
          'dest_index',
          'failure_reason',
          'id',
          'model_memory_limit',
          'node.address',
          'node.ephemeral_id',
          'node.id',
          'node.name',
          'progress',
          'source_index',
          'state',
          'type',
          'version',
        ])
        .optional()
        .describe('Enum parameter: s'),
      time: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: time'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.ml_data_frame_analytics API'),
  },
  {
    type: 'elasticsearch.cat.ml_datafeeds',
    connectorIdRequired: false,
    description: 'GET _cat/ml/datafeeds | _cat/ml/datafeeds/{datafeed_id} - 11 parameters',
    methods: ['GET'],
    patterns: ['_cat/ml/datafeeds', '_cat/ml/datafeeds/{datafeed_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-ml-datafeeds',
    parameterTypes: {
      pathParams: ['datafeed_id'],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_match',
        'h',
        's',
        'time',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      datafeed_id: z.string().describe('Path parameter: datafeed_id (required)'),
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      h: z
        .enum(['ae', 'bc', 'id', 'na', 'ne', 'ni', 'nn', 'sba', 'sc', 'seah', 'st', 's'])
        .optional()
        .describe('Enum parameter: h'),
      s: z
        .enum(['ae', 'bc', 'id', 'na', 'ne', 'ni', 'nn', 'sba', 'sc', 'seah', 'st', 's'])
        .optional()
        .describe('Enum parameter: s'),
      time: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: time'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.ml_datafeeds API'),
  },
  {
    type: 'elasticsearch.cat.ml_jobs',
    connectorIdRequired: false,
    description:
      'GET _cat/ml/anomaly_detectors | _cat/ml/anomaly_detectors/{job_id} - 12 parameters',
    methods: ['GET'],
    patterns: ['_cat/ml/anomaly_detectors', '_cat/ml/anomaly_detectors/{job_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-ml-jobs',
    parameterTypes: {
      pathParams: ['job_id'],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_match',
        'bytes',
        'h',
        's',
        'time',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      bytes: z
        .enum(['b', 'kb', 'mb', 'gb', 'tb', 'pb'])
        .optional()
        .describe('Enum parameter: bytes'),
      h: z
        .enum([
          'assignment_explanation',
          'buckets.count',
          'buckets.time.exp_avg',
          'buckets.time.exp_avg_hour',
          'buckets.time.max',
          'buckets.time.min',
          'buckets.time.total',
          'data.buckets',
          'data.earliest_record',
          'data.empty_buckets',
          'data.input_bytes',
          'data.input_fields',
          'data.input_records',
          'data.invalid_dates',
          'data.last',
          'data.last_empty_bucket',
          'data.last_sparse_bucket',
          'data.latest_record',
          'data.missing_fields',
          'data.out_of_order_timestamps',
          'data.processed_fields',
          'data.processed_records',
          'data.sparse_buckets',
          'forecasts.memory.avg',
          'forecasts.memory.max',
          'forecasts.memory.min',
          'forecasts.memory.total',
          'forecasts.records.avg',
          'forecasts.records.max',
          'forecasts.records.min',
          'forecasts.records.total',
          'forecasts.time.avg',
          'forecasts.time.max',
          'forecasts.time.min',
          'forecasts.time.total',
          'forecasts.total',
          'id',
          'model.bucket_allocation_failures',
          'model.by_fields',
          'model.bytes',
          'model.bytes_exceeded',
          'model.categorization_status',
          'model.categorized_doc_count',
          'model.dead_category_count',
          'model.failed_category_count',
          'model.frequent_category_count',
          'model.log_time',
          'model.memory_limit',
          'model.memory_status',
          'model.over_fields',
          'model.partition_fields',
          'model.rare_category_count',
          'model.timestamp',
          'model.total_category_count',
          'node.address',
          'node.ephemeral_id',
          'node.id',
          'node.name',
          'opened_time',
          'state',
        ])
        .optional()
        .describe('Enum parameter: h'),
      s: z
        .enum([
          'assignment_explanation',
          'buckets.count',
          'buckets.time.exp_avg',
          'buckets.time.exp_avg_hour',
          'buckets.time.max',
          'buckets.time.min',
          'buckets.time.total',
          'data.buckets',
          'data.earliest_record',
          'data.empty_buckets',
          'data.input_bytes',
          'data.input_fields',
          'data.input_records',
          'data.invalid_dates',
          'data.last',
          'data.last_empty_bucket',
          'data.last_sparse_bucket',
          'data.latest_record',
          'data.missing_fields',
          'data.out_of_order_timestamps',
          'data.processed_fields',
          'data.processed_records',
          'data.sparse_buckets',
          'forecasts.memory.avg',
          'forecasts.memory.max',
          'forecasts.memory.min',
          'forecasts.memory.total',
          'forecasts.records.avg',
          'forecasts.records.max',
          'forecasts.records.min',
          'forecasts.records.total',
          'forecasts.time.avg',
          'forecasts.time.max',
          'forecasts.time.min',
          'forecasts.time.total',
          'forecasts.total',
          'id',
          'model.bucket_allocation_failures',
          'model.by_fields',
          'model.bytes',
          'model.bytes_exceeded',
          'model.categorization_status',
          'model.categorized_doc_count',
          'model.dead_category_count',
          'model.failed_category_count',
          'model.frequent_category_count',
          'model.log_time',
          'model.memory_limit',
          'model.memory_status',
          'model.over_fields',
          'model.partition_fields',
          'model.rare_category_count',
          'model.timestamp',
          'model.total_category_count',
          'node.address',
          'node.ephemeral_id',
          'node.id',
          'node.name',
          'opened_time',
          'state',
        ])
        .optional()
        .describe('Enum parameter: s'),
      time: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: time'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.ml_jobs API'),
  },
  {
    type: 'elasticsearch.cat.ml_trained_models',
    connectorIdRequired: false,
    description: 'GET _cat/ml/trained_models | _cat/ml/trained_models/{model_id} - 14 parameters',
    methods: ['GET'],
    patterns: ['_cat/ml/trained_models', '_cat/ml/trained_models/{model_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-ml-trained-models',
    parameterTypes: {
      pathParams: ['model_id'],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_match',
        'bytes',
        'h',
        's',
        'from',
        'size',
        'time',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      model_id: z.string().describe('Path parameter: model_id (required)'),
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      bytes: z
        .enum(['b', 'kb', 'mb', 'gb', 'tb', 'pb'])
        .optional()
        .describe('Enum parameter: bytes'),
      h: z
        .enum([
          'create_time',
          'created_by',
          'data_frame_analytics_id',
          'description',
          'heap_size',
          'id',
          'ingest.count',
          'ingest.current',
          'ingest.failed',
          'ingest.pipelines',
          'ingest.time',
          'license',
          'operations',
          'version',
        ])
        .optional()
        .describe('Enum parameter: h'),
      s: z
        .enum([
          'create_time',
          'created_by',
          'data_frame_analytics_id',
          'description',
          'heap_size',
          'id',
          'ingest.count',
          'ingest.current',
          'ingest.failed',
          'ingest.pipelines',
          'ingest.time',
          'license',
          'operations',
          'version',
        ])
        .optional()
        .describe('Enum parameter: s'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      size: z.union([z.string(), z.number()]).optional().describe('Parameter: size'),
      time: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: time'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.ml_trained_models API'),
  },
  {
    type: 'elasticsearch.cat.nodeattrs',
    connectorIdRequired: false,
    description: 'GET _cat/nodeattrs - 11 parameters',
    methods: ['GET'],
    patterns: ['_cat/nodeattrs'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-nodeattrs',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'h',
        's',
        'local',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      h: z.array(z.string()).optional().describe('Array parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.nodeattrs API'),
  },
  {
    type: 'elasticsearch.cat.nodes',
    connectorIdRequired: false,
    description: 'GET _cat/nodes - 14 parameters',
    methods: ['GET'],
    patterns: ['_cat/nodes'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-nodes',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'bytes',
        'full_id',
        'include_unloaded_segments',
        'h',
        's',
        'master_timeout',
        'time',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      bytes: z
        .enum(['b', 'kb', 'mb', 'gb', 'tb', 'pb'])
        .optional()
        .describe('Enum parameter: bytes'),
      full_id: z.boolean().optional().describe('Boolean flag: full_id'),
      include_unloaded_segments: z
        .boolean()
        .optional()
        .describe('Boolean flag: include_unloaded_segments'),
      h: z
        .enum([
          'build',
          'completion.size',
          'cpu',
          'disk.avail',
          'disk.total',
          'disk.used',
          'disk.used_percent',
          'fielddata.evictions',
          'fielddata.memory_size',
          'file_desc.current',
          'file_desc.max',
          'file_desc.percent',
          'flush.total',
          'flush.total_time',
          'get.current',
          'get.exists_time',
          'get.exists_total',
          'get.missing_time',
          'get.missing_total',
          'get.time',
          'get.total',
          'heap.current',
          'heap.max',
          'heap.percent',
          'http_address',
          'id',
          'indexing.delete_current',
          'indexing.delete_time',
          'indexing.delete_total',
          'indexing.index_current',
          'indexing.index_failed',
          'indexing.index_failed_due_to_version_conflict',
          'indexing.index_time',
          'indexing.index_total',
          'ip',
          'jdk',
          'load_1m',
          'load_5m',
          'load_15m',
          'mappings.total_count',
          'mappings.total_estimated_overhead_in_bytes',
          'master',
          'merges.current',
          'merges.current_docs',
          'merges.current_size',
          'merges.total',
          'merges.total_docs',
          'merges.total_size',
          'merges.total_time',
          'name',
          'node.role',
          'pid',
          'port',
          'query_cache.memory_size',
          'query_cache.evictions',
          'query_cache.hit_count',
          'query_cache.miss_count',
          'ram.current',
          'ram.max',
          'ram.percent',
          'refresh.total',
          'refresh.time',
          'request_cache.memory_size',
          'request_cache.evictions',
          'request_cache.hit_count',
          'request_cache.miss_count',
          'script.compilations',
          'script.cache_evictions',
          'search.fetch_current',
          'search.fetch_time',
          'search.fetch_total',
          'search.open_contexts',
          'search.query_current',
          'search.query_time',
          'search.query_total',
          'search.scroll_current',
          'search.scroll_time',
          'search.scroll_total',
          'segments.count',
          'segments.fixed_bitset_memory',
          'segments.index_writer_memory',
          'segments.memory',
          'segments.version_map_memory',
          'shard_stats.total_count',
          'suggest.current',
          'suggest.time',
          'suggest.total',
          'uptime',
          'version',
        ])
        .optional()
        .describe('Enum parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      time: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: time'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.nodes API'),
  },
  {
    type: 'elasticsearch.cat.pending_tasks',
    connectorIdRequired: false,
    description: 'GET _cat/pending_tasks - 12 parameters',
    methods: ['GET'],
    patterns: ['_cat/pending_tasks'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-pending-tasks',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'h',
        's',
        'local',
        'master_timeout',
        'time',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      h: z.array(z.string()).optional().describe('Array parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      time: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: time'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.pending_tasks API'),
  },
  {
    type: 'elasticsearch.cat.plugins',
    connectorIdRequired: false,
    description: 'GET _cat/plugins - 12 parameters',
    methods: ['GET'],
    patterns: ['_cat/plugins'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-plugins',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'h',
        's',
        'include_bootstrap',
        'local',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      h: z.array(z.string()).optional().describe('Array parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      include_bootstrap: z.boolean().optional().describe('Boolean flag: include_bootstrap'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.plugins API'),
  },
  {
    type: 'elasticsearch.cat.recovery',
    connectorIdRequired: false,
    description: 'GET _cat/recovery | _cat/recovery/{index} - 14 parameters',
    methods: ['GET'],
    patterns: ['_cat/recovery', '_cat/recovery/{index}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-recovery',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'active_only',
        'bytes',
        'detailed',
        'index',
        'h',
        's',
        'time',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      active_only: z.boolean().optional().describe('Boolean flag: active_only'),
      bytes: z
        .enum(['b', 'kb', 'mb', 'gb', 'tb', 'pb'])
        .optional()
        .describe('Enum parameter: bytes'),
      detailed: z.boolean().optional().describe('Boolean flag: detailed'),
      h: z
        .enum([
          'index',
          'shard',
          'time',
          'type',
          'stage',
          'source_host',
          'source_node',
          'target_host',
          'target_node',
          'repository',
          'snapshot',
          'files',
          'files_recovered',
          'files_percent',
          'files_total',
          'bytes',
          'bytes_recovered',
          'bytes_percent',
          'bytes_total',
          'translog_ops',
          'translog_ops_recovered',
          'translog_ops_percent',
          'start_time',
          'start_time_millis',
          'stop_time',
          'stop_time_millis',
        ])
        .optional()
        .describe('Enum parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      time: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: time'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.recovery API'),
  },
  {
    type: 'elasticsearch.cat.repositories',
    connectorIdRequired: false,
    description: 'GET _cat/repositories - 11 parameters',
    methods: ['GET'],
    patterns: ['_cat/repositories'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-repositories',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'h',
        's',
        'local',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      h: z.array(z.string()).optional().describe('Array parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.repositories API'),
  },
  {
    type: 'elasticsearch.cat.segments',
    connectorIdRequired: false,
    description: 'GET _cat/segments | _cat/segments/{index} - 12 parameters',
    methods: ['GET'],
    patterns: ['_cat/segments', '_cat/segments/{index}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-segments',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'bytes',
        'h',
        's',
        'local',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      bytes: z
        .enum(['b', 'kb', 'mb', 'gb', 'tb', 'pb'])
        .optional()
        .describe('Enum parameter: bytes'),
      h: z
        .enum([
          'index',
          'shard',
          'prirep',
          'ip',
          'segment',
          'generation',
          'docs.count',
          'docs.deleted',
          'size',
          'size.memory',
          'committed',
          'searchable',
          'version',
          'compound',
          'id',
        ])
        .optional()
        .describe('Enum parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.segments API'),
  },
  {
    type: 'elasticsearch.cat.shards',
    connectorIdRequired: false,
    description: 'GET _cat/shards | _cat/shards/{index} - 12 parameters',
    methods: ['GET'],
    patterns: ['_cat/shards', '_cat/shards/{index}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-shards',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'bytes',
        'h',
        's',
        'master_timeout',
        'time',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      bytes: z
        .enum(['b', 'kb', 'mb', 'gb', 'tb', 'pb'])
        .optional()
        .describe('Enum parameter: bytes'),
      h: z
        .enum([
          'completion.size',
          'dataset.size',
          'dense_vector.value_count',
          'docs',
          'fielddata.evictions',
          'fielddata.memory_size',
          'flush.total',
          'flush.total_time',
          'get.current',
          'get.exists_time',
          'get.exists_total',
          'get.missing_time',
          'get.missing_total',
          'get.time',
          'get.total',
          'id',
          'index',
          'indexing.delete_current',
          'indexing.delete_time',
          'indexing.delete_total',
          'indexing.index_current',
          'indexing.index_failed_due_to_version_conflict',
          'indexing.index_failed',
          'indexing.index_time',
          'indexing.index_total',
          'ip',
          'merges.current',
          'merges.current_docs',
          'merges.current_size',
          'merges.total',
          'merges.total_docs',
          'merges.total_size',
          'merges.total_time',
          'node',
          'prirep',
          'query_cache.evictions',
          'query_cache.memory_size',
          'recoverysource.type',
          'refresh.time',
          'refresh.total',
          'search.fetch_current',
          'search.fetch_time',
          'search.fetch_total',
          'search.open_contexts',
          'search.query_current',
          'search.query_time',
          'search.query_total',
          'search.scroll_current',
          'search.scroll_time',
          'search.scroll_total',
          'segments.count',
          'segments.fixed_bitset_memory',
          'segments.index_writer_memory',
          'segments.memory',
          'segments.version_map_memory',
          'seq_no.global_checkpoint',
          'seq_no.local_checkpoint',
          'seq_no.max',
          'shard',
          'dsparse_vector.value_count',
          'state',
          'store',
          'suggest.current',
          'suggest.time',
          'suggest.total',
          'sync_id',
          'unassigned.at',
          'unassigned.details',
          'unassigned.for',
          'unassigned.reason',
        ])
        .optional()
        .describe('Enum parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      time: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: time'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.shards API'),
  },
  {
    type: 'elasticsearch.cat.snapshots',
    connectorIdRequired: false,
    description: 'GET _cat/snapshots | _cat/snapshots/{repository} - 12 parameters',
    methods: ['GET'],
    patterns: ['_cat/snapshots', '_cat/snapshots/{repository}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-snapshots',
    parameterTypes: {
      pathParams: ['repository'],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'ignore_unavailable',
        'h',
        's',
        'master_timeout',
        'time',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      repository: z.string().describe('Path parameter: repository (required)'),
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      h: z
        .enum([
          'id',
          'repository',
          'status',
          'start_epoch',
          'start_time',
          'end_epoch',
          'end_time',
          'duration',
          'indices',
          'successful_shards',
          'failed_shards',
          'total_shards',
          'reason',
          'build',
          'completion.size',
          'cpu',
          'disk.avail',
          'disk.total',
          'disk.used',
          'disk.used_percent',
          'fielddata.evictions',
          'fielddata.memory_size',
          'file_desc.current',
          'file_desc.max',
          'file_desc.percent',
          'flush.total',
          'flush.total_time',
          'get.current',
          'get.exists_time',
          'get.exists_total',
          'get.missing_time',
          'get.missing_total',
          'get.time',
          'get.total',
          'heap.current',
          'heap.max',
          'heap.percent',
          'http_address',
          'indexing.delete_current',
          'indexing.delete_time',
          'indexing.delete_total',
          'indexing.index_current',
          'indexing.index_failed',
          'indexing.index_failed_due_to_version_conflict',
          'indexing.index_time',
          'indexing.index_total',
          'ip',
          'jdk',
          'load_1m',
          'load_5m',
          'load_15m',
          'mappings.total_count',
          'mappings.total_estimated_overhead_in_bytes',
          'master',
          'merges.current',
          'merges.current_docs',
          'merges.current_size',
          'merges.total',
          'merges.total_docs',
          'merges.total_size',
          'merges.total_time',
          'name',
          'node.role',
          'pid',
          'port',
          'query_cache.memory_size',
          'query_cache.evictions',
          'query_cache.hit_count',
          'query_cache.miss_count',
          'ram.current',
          'ram.max',
          'ram.percent',
          'refresh.total',
          'refresh.time',
          'request_cache.memory_size',
          'request_cache.evictions',
          'request_cache.hit_count',
          'request_cache.miss_count',
          'script.compilations',
          'script.cache_evictions',
          'search.fetch_current',
          'search.fetch_time',
          'search.fetch_total',
          'search.open_contexts',
          'search.query_current',
          'search.query_time',
          'search.query_total',
          'search.scroll_current',
          'search.scroll_time',
          'search.scroll_total',
          'segments.count',
          'segments.fixed_bitset_memory',
          'segments.index_writer_memory',
          'segments.memory',
          'segments.version_map_memory',
          'shard_stats.total_count',
          'suggest.current',
          'suggest.time',
          'suggest.total',
          'uptime',
          'version',
        ])
        .optional()
        .describe('Enum parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      time: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: time'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.snapshots API'),
  },
  {
    type: 'elasticsearch.cat.tasks',
    connectorIdRequired: false,
    description: 'GET _cat/tasks - 16 parameters',
    methods: ['GET'],
    patterns: ['_cat/tasks'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-tasks',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'actions',
        'detailed',
        'nodes',
        'parent_task_id',
        'h',
        's',
        'time',
        'timeout',
        'wait_for_completion',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      actions: z.union([z.string(), z.number()]).optional().describe('Parameter: actions'),
      detailed: z.boolean().optional().describe('Boolean flag: detailed'),
      nodes: z.union([z.string(), z.number()]).optional().describe('Parameter: nodes'),
      parent_task_id: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: parent_task_id'),
      h: z.array(z.string()).optional().describe('Array parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      time: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: time'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      wait_for_completion: z.boolean().optional().describe('Boolean flag: wait_for_completion'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.tasks API'),
  },
  {
    type: 'elasticsearch.cat.templates',
    connectorIdRequired: false,
    description: 'GET _cat/templates | _cat/templates/{name} - 11 parameters',
    methods: ['GET'],
    patterns: ['_cat/templates', '_cat/templates/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-templates',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'h',
        's',
        'local',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      h: z.array(z.string()).optional().describe('Array parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.templates API'),
  },
  {
    type: 'elasticsearch.cat.thread_pool',
    connectorIdRequired: false,
    description: 'GET _cat/thread_pool | _cat/thread_pool/{thread_pool_patterns} - 12 parameters',
    methods: ['GET'],
    patterns: ['_cat/thread_pool', '_cat/thread_pool/{thread_pool_patterns}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-thread-pool',
    parameterTypes: {
      pathParams: ['thread_pool_patterns'],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'h',
        's',
        'time',
        'local',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      thread_pool_patterns: z.string().describe('Path parameter: thread_pool_patterns (required)'),
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      h: z
        .enum([
          'active',
          'completed',
          'core',
          'ephemeral_id',
          'host',
          'ip',
          'keep_alive',
          'largest',
          'max',
          'name',
          'node_id',
          'node_name',
          'pid',
          'pool_size',
          'port',
          'queue',
          'queue_size',
          'rejected',
          'size',
          'type',
        ])
        .optional()
        .describe('Enum parameter: h'),
      s: z.array(z.string()).optional().describe('Array parameter: s'),
      time: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: time'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.thread_pool API'),
  },
  {
    type: 'elasticsearch.cat.transforms',
    connectorIdRequired: false,
    description: 'GET _cat/transforms | _cat/transforms/{transform_id} - 13 parameters',
    methods: ['GET'],
    patterns: ['_cat/transforms', '_cat/transforms/{transform_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-transforms',
    parameterTypes: {
      pathParams: ['transform_id'],
      urlParams: [
        'format',
        'help',
        'v',
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_match',
        'from',
        'h',
        's',
        'time',
        'size',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      transform_id: z.string().describe('Path parameter: transform_id (required)'),
      format: z.enum(['text']).optional().describe('Enum parameter: format'),
      help: z.boolean().optional().describe('Boolean flag: help'),
      v: z.boolean().optional().describe('Boolean flag: v'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      h: z
        .enum([
          'changes_last_detection_time',
          'checkpoint',
          'checkpoint_duration_time_exp_avg',
          'checkpoint_progress',
          'create_time',
          'delete_time',
          'description',
          'dest_index',
          'documents_deleted',
          'documents_indexed',
          'docs_per_second',
          'documents_processed',
          'frequency',
          'id',
          'index_failure',
          'index_time',
          'index_total',
          'indexed_documents_exp_avg',
          'last_search_time',
          'max_page_search_size',
          'pages_processed',
          'pipeline',
          'processed_documents_exp_avg',
          'processing_time',
          'reason',
          'search_failure',
          'search_time',
          'search_total',
          'source_index',
          'state',
          'transform_type',
          'trigger_count',
          'version',
        ])
        .optional()
        .describe('Enum parameter: h'),
      s: z
        .enum([
          'changes_last_detection_time',
          'checkpoint',
          'checkpoint_duration_time_exp_avg',
          'checkpoint_progress',
          'create_time',
          'delete_time',
          'description',
          'dest_index',
          'documents_deleted',
          'documents_indexed',
          'docs_per_second',
          'documents_processed',
          'frequency',
          'id',
          'index_failure',
          'index_time',
          'index_total',
          'indexed_documents_exp_avg',
          'last_search_time',
          'max_page_search_size',
          'pages_processed',
          'pipeline',
          'processed_documents_exp_avg',
          'processing_time',
          'reason',
          'search_failure',
          'search_time',
          'search_total',
          'source_index',
          'state',
          'transform_type',
          'trigger_count',
          'version',
        ])
        .optional()
        .describe('Enum parameter: s'),
      time: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: time'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['100'])])
        .optional()
        .describe('Numeric parameter: size'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.transforms API'),
  },
  {
    type: 'elasticsearch.ccr.delete_auto_follow_pattern',
    connectorIdRequired: false,
    description: 'DELETE _ccr/auto_follow/{name} - 5 parameters',
    methods: ['DELETE'],
    patterns: ['_ccr/auto_follow/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-delete-auto-follow-pattern',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ccr.delete_auto_follow_pattern API'),
  },
  {
    type: 'elasticsearch.ccr.follow',
    connectorIdRequired: false,
    description: 'PUT {index}/_ccr/follow - 6 parameters',
    methods: ['PUT'],
    patterns: ['{index}/_ccr/follow'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-follow',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'master_timeout',
        'wait_for_active_shards',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      wait_for_active_shards: z
        .enum(['all', 'index-setting'])
        .optional()
        .describe('Enum parameter: wait_for_active_shards'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ccr.follow API'),
  },
  {
    type: 'elasticsearch.ccr.follow_info',
    connectorIdRequired: false,
    description: 'GET {index}/_ccr/info - 5 parameters',
    methods: ['GET'],
    patterns: ['{index}/_ccr/info'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-follow-info',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ccr.follow_info API'),
  },
  {
    type: 'elasticsearch.ccr.follow_stats',
    connectorIdRequired: false,
    description: 'GET {index}/_ccr/stats - 5 parameters',
    methods: ['GET'],
    patterns: ['{index}/_ccr/stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-follow-stats',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ccr.follow_stats API'),
  },
  {
    type: 'elasticsearch.ccr.forget_follower',
    connectorIdRequired: false,
    description: 'POST {index}/_ccr/forget_follower - 5 parameters',
    methods: ['POST'],
    patterns: ['{index}/_ccr/forget_follower'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-forget-follower',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ccr.forget_follower API'),
  },
  {
    type: 'elasticsearch.ccr.get_auto_follow_pattern',
    connectorIdRequired: false,
    description: 'GET _ccr/auto_follow | _ccr/auto_follow/{name} - 5 parameters',
    methods: ['GET'],
    patterns: ['_ccr/auto_follow', '_ccr/auto_follow/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-get-auto-follow-pattern-1',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ccr.get_auto_follow_pattern API'),
  },
  {
    type: 'elasticsearch.ccr.pause_auto_follow_pattern',
    connectorIdRequired: false,
    description: 'POST _ccr/auto_follow/{name}/pause - 5 parameters',
    methods: ['POST'],
    patterns: ['_ccr/auto_follow/{name}/pause'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-pause-auto-follow-pattern',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ccr.pause_auto_follow_pattern API'),
  },
  {
    type: 'elasticsearch.ccr.pause_follow',
    connectorIdRequired: false,
    description: 'POST {index}/_ccr/pause_follow - 5 parameters',
    methods: ['POST'],
    patterns: ['{index}/_ccr/pause_follow'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-pause-follow',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ccr.pause_follow API'),
  },
  {
    type: 'elasticsearch.ccr.put_auto_follow_pattern',
    connectorIdRequired: false,
    description: 'PUT _ccr/auto_follow/{name} - 5 parameters',
    methods: ['PUT'],
    patterns: ['_ccr/auto_follow/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-put-auto-follow-pattern',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ccr.put_auto_follow_pattern API'),
  },
  {
    type: 'elasticsearch.ccr.resume_auto_follow_pattern',
    connectorIdRequired: false,
    description: 'POST _ccr/auto_follow/{name}/resume - 5 parameters',
    methods: ['POST'],
    patterns: ['_ccr/auto_follow/{name}/resume'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-resume-auto-follow-pattern',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ccr.resume_auto_follow_pattern API'),
  },
  {
    type: 'elasticsearch.ccr.resume_follow',
    connectorIdRequired: false,
    description: 'POST {index}/_ccr/resume_follow - 5 parameters',
    methods: ['POST'],
    patterns: ['{index}/_ccr/resume_follow'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-resume-follow',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ccr.resume_follow API'),
  },
  {
    type: 'elasticsearch.ccr.stats',
    connectorIdRequired: false,
    description: 'GET _ccr/stats - 6 parameters',
    methods: ['GET'],
    patterns: ['_ccr/stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-stats',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ccr.stats API'),
  },
  {
    type: 'elasticsearch.ccr.unfollow',
    connectorIdRequired: false,
    description: 'POST {index}/_ccr/unfollow - 5 parameters',
    methods: ['POST'],
    patterns: ['{index}/_ccr/unfollow'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-unfollow',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ccr.unfollow API'),
  },
  {
    type: 'elasticsearch.clear_scroll',
    connectorIdRequired: false,
    description: 'DELETE _search/scroll | _search/scroll/{scroll_id} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_search/scroll', '_search/scroll/{scroll_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-clear-scroll',
    parameterTypes: {
      pathParams: ['scroll_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      scroll_id: z.string().describe('Path parameter: scroll_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from clear_scroll API'),
  },
  {
    type: 'elasticsearch.close_point_in_time',
    connectorIdRequired: false,
    description: 'DELETE _pit - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_pit'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-open-point-in-time',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from close_point_in_time API'),
  },
  {
    type: 'elasticsearch.cluster.allocation_explain',
    connectorIdRequired: false,
    description: 'GET/POST _cluster/allocation/explain - 7 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_cluster/allocation/explain'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-allocation-explain',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'include_disk_info',
        'include_yes_decisions',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      include_disk_info: z.boolean().optional().describe('Boolean flag: include_disk_info'),
      include_yes_decisions: z.boolean().optional().describe('Boolean flag: include_yes_decisions'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cluster.allocation_explain API'),
  },
  {
    type: 'elasticsearch.cluster.delete_component_template',
    connectorIdRequired: false,
    description: 'DELETE _component_template/{name} - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_component_template/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-component-template',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cluster.delete_component_template API'),
  },
  {
    type: 'elasticsearch.cluster.delete_voting_config_exclusions',
    connectorIdRequired: false,
    description: 'DELETE _cluster/voting_config_exclusions - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_cluster/voting_config_exclusions'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-post-voting-config-exclusions',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'master_timeout',
        'wait_for_removal',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      wait_for_removal: z.boolean().optional().describe('Boolean flag: wait_for_removal'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cluster.delete_voting_config_exclusions API'),
  },
  {
    type: 'elasticsearch.cluster.exists_component_template',
    connectorIdRequired: false,
    description: 'HEAD _component_template/{name} - 6 parameters',
    methods: ['HEAD'],
    patterns: ['_component_template/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-component-template',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'local'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cluster.exists_component_template API'),
  },
  {
    type: 'elasticsearch.cluster.get_component_template',
    connectorIdRequired: false,
    description: 'GET _component_template | _component_template/{name} - 8 parameters',
    methods: ['GET'],
    patterns: ['_component_template', '_component_template/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-component-template',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'flat_settings',
        'include_defaults',
        'local',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      flat_settings: z.boolean().optional().describe('Boolean flag: flat_settings'),
      include_defaults: z.boolean().optional().describe('Boolean flag: include_defaults'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cluster.get_component_template API'),
  },
  {
    type: 'elasticsearch.cluster.get_settings',
    connectorIdRequired: false,
    description: 'GET _cluster/settings - 8 parameters',
    methods: ['GET'],
    patterns: ['_cluster/settings'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-get-settings',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'flat_settings',
        'include_defaults',
        'master_timeout',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      flat_settings: z.boolean().optional().describe('Boolean flag: flat_settings'),
      include_defaults: z.boolean().optional().describe('Boolean flag: include_defaults'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cluster.get_settings API'),
  },
  {
    type: 'elasticsearch.cluster.health',
    connectorIdRequired: false,
    description: 'GET _cluster/health | _cluster/health/{index} - 15 parameters',
    methods: ['GET'],
    patterns: ['_cluster/health', '_cluster/health/{index}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-health',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'expand_wildcards',
        'level',
        'local',
        'master_timeout',
        'timeout',
        'wait_for_active_shards',
        'wait_for_events',
        'wait_for_nodes',
        'wait_for_no_initializing_shards',
        'wait_for_no_relocating_shards',
        'wait_for_status',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      level: z.enum(['cluster', 'indices', 'shards']).optional().describe('Enum parameter: level'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      wait_for_active_shards: z
        .enum(['0', 'all', 'index-setting'])
        .optional()
        .describe('Enum parameter: wait_for_active_shards'),
      wait_for_events: z
        .enum(['immediate', 'urgent', 'high', 'normal', 'low', 'languid'])
        .optional()
        .describe('Enum parameter: wait_for_events'),
      wait_for_nodes: z.array(z.string()).optional().describe('Array parameter: wait_for_nodes'),
      wait_for_no_initializing_shards: z
        .boolean()
        .optional()
        .describe('Boolean flag: wait_for_no_initializing_shards'),
      wait_for_no_relocating_shards: z
        .boolean()
        .optional()
        .describe('Boolean flag: wait_for_no_relocating_shards'),
      wait_for_status: z
        .enum(['green', 'yellow', 'red'])
        .optional()
        .describe('Enum parameter: wait_for_status'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cluster.health API'),
  },
  {
    type: 'elasticsearch.cluster.info',
    connectorIdRequired: false,
    description: 'GET _info/{target} - 4 parameters',
    methods: ['GET'],
    patterns: ['_info/{target}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-info',
    parameterTypes: {
      pathParams: ['target'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      target: z.string().describe('Path parameter: target (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cluster.info API'),
  },
  {
    type: 'elasticsearch.cluster.pending_tasks',
    connectorIdRequired: false,
    description: 'GET _cluster/pending_tasks - 6 parameters',
    methods: ['GET'],
    patterns: ['_cluster/pending_tasks'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-pending-tasks',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'local', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cluster.pending_tasks API'),
  },
  {
    type: 'elasticsearch.cluster.post_voting_config_exclusions',
    connectorIdRequired: false,
    description: 'POST _cluster/voting_config_exclusions - 8 parameters',
    methods: ['POST'],
    patterns: ['_cluster/voting_config_exclusions'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-post-voting-config-exclusions',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'node_names',
        'node_ids',
        'master_timeout',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      node_names: z.array(z.string()).optional().describe('Array parameter: node_names'),
      node_ids: z.array(z.string()).optional().describe('Array parameter: node_ids'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cluster.post_voting_config_exclusions API'),
  },
  {
    type: 'elasticsearch.cluster.put_component_template',
    connectorIdRequired: false,
    description: 'PUT/POST _component_template/{name} - 6 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_component_template/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-component-template',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'create', 'master_timeout'],
      bodyParams: ['template', 'version', 'meta'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      create: z.boolean().optional().describe('Boolean flag: create'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      template: z.object({}).passthrough().optional().describe('Template configuration'),
      version: z.number().optional().describe('Template version'),
      meta: z.object({}).passthrough().optional().describe('Mapping metadata'),
    }),
    outputSchema: z.any().describe('Response from cluster.put_component_template API'),
  },
  {
    type: 'elasticsearch.cluster.put_settings',
    connectorIdRequired: false,
    description: 'PUT _cluster/settings - 7 parameters',
    methods: ['PUT'],
    patterns: ['_cluster/settings'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-settings',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'flat_settings',
        'master_timeout',
        'timeout',
      ],
      bodyParams: ['persistent', 'transient'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      flat_settings: z.boolean().optional().describe('Boolean flag: flat_settings'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      persistent: z.object({}).passthrough().optional().describe('Persistent cluster settings'),
      transient: z.object({}).passthrough().optional().describe('Transient cluster settings'),
    }),
    outputSchema: z.any().describe('Response from cluster.put_settings API'),
  },
  {
    type: 'elasticsearch.cluster.remote_info',
    connectorIdRequired: false,
    description: 'GET _remote/info - 4 parameters',
    methods: ['GET'],
    patterns: ['_remote/info'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-remote-info',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cluster.remote_info API'),
  },
  {
    type: 'elasticsearch.cluster.reroute',
    connectorIdRequired: false,
    description: 'POST _cluster/reroute - 10 parameters',
    methods: ['POST'],
    patterns: ['_cluster/reroute'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-reroute',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'dry_run',
        'explain',
        'metric',
        'retry_failed',
        'master_timeout',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      dry_run: z.boolean().optional().describe('Boolean flag: dry_run'),
      explain: z.boolean().optional().describe('Boolean flag: explain'),
      metric: z.enum(['all']).optional().describe('Enum parameter: metric'),
      retry_failed: z.boolean().optional().describe('Boolean flag: retry_failed'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cluster.reroute API'),
  },
  {
    type: 'elasticsearch.cluster.state',
    connectorIdRequired: false,
    description:
      'GET _cluster/state | _cluster/state/{metric} | _cluster/state/{metric}/{index} - 12 parameters',
    methods: ['GET'],
    patterns: ['_cluster/state', '_cluster/state/{metric}', '_cluster/state/{metric}/{index}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-state',
    parameterTypes: {
      pathParams: ['metric', 'index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'flat_settings',
        'ignore_unavailable',
        'local',
        'master_timeout',
        'wait_for_metadata_version',
        'wait_for_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      metric: z.string().describe('Path parameter: metric (required)'),
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      flat_settings: z.boolean().optional().describe('Boolean flag: flat_settings'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      wait_for_metadata_version: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: wait_for_metadata_version'),
      wait_for_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: wait_for_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cluster.state API'),
  },
  {
    type: 'elasticsearch.cluster.stats',
    connectorIdRequired: false,
    description: 'GET _cluster/stats | _cluster/stats/nodes/{node_id} - 6 parameters',
    methods: ['GET'],
    patterns: ['_cluster/stats', '_cluster/stats/nodes/{node_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-stats',
    parameterTypes: {
      pathParams: ['node_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'include_remotes', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      node_id: z.string().describe('Path parameter: node_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      include_remotes: z.boolean().optional().describe('Boolean flag: include_remotes'),
      timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cluster.stats API'),
  },
  {
    type: 'elasticsearch.connector.check_in',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_check_in - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/{connector_id}/_check_in'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-check-in',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.check_in API'),
  },
  {
    type: 'elasticsearch.connector.delete',
    connectorIdRequired: false,
    description: 'DELETE _connector/{connector_id} - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_connector/{connector_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-delete',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'delete_sync_jobs', 'hard'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      delete_sync_jobs: z.boolean().optional().describe('Boolean flag: delete_sync_jobs'),
      hard: z.boolean().optional().describe('Boolean flag: hard'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.delete API'),
  },
  {
    type: 'elasticsearch.connector.get',
    connectorIdRequired: false,
    description: 'GET _connector/{connector_id} - 5 parameters',
    methods: ['GET'],
    patterns: ['_connector/{connector_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-get',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'include_deleted'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      include_deleted: z.boolean().optional().describe('Boolean flag: include_deleted'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.get API'),
  },
  {
    type: 'elasticsearch.connector.last_sync',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_last_sync - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/{connector_id}/_last_sync'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-last-sync',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.last_sync API'),
  },
  {
    type: 'elasticsearch.connector.list',
    connectorIdRequired: false,
    description: 'GET _connector - 11 parameters',
    methods: ['GET'],
    patterns: ['_connector'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-list',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'from',
        'size',
        'index_name',
        'connector_name',
        'service_type',
        'include_deleted',
        'query',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      size: z.union([z.string(), z.number()]).optional().describe('Parameter: size'),
      index_name: z.array(z.string()).optional().describe('Array parameter: index_name'),
      connector_name: z.array(z.string()).optional().describe('Array parameter: connector_name'),
      service_type: z.array(z.string()).optional().describe('Array parameter: service_type'),
      include_deleted: z.boolean().optional().describe('Boolean flag: include_deleted'),
      query: z.union([z.string(), z.number()]).optional().describe('Parameter: query'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.list API'),
  },
  {
    type: 'elasticsearch.connector.post',
    connectorIdRequired: false,
    description: 'POST _connector - 4 parameters',
    methods: ['POST'],
    patterns: ['_connector'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-put',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.post API'),
  },
  {
    type: 'elasticsearch.connector.put',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id} | _connector - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/{connector_id}', '_connector'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-put',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.put API'),
  },
  {
    type: 'elasticsearch.connector.secret_delete',
    connectorIdRequired: false,
    description: 'DELETE _connector/_secret/{id} - 0 parameters',
    methods: ['DELETE'],
    patterns: ['_connector/_secret/{id}'],
    isInternal: true,
    documentation: null,
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.secret_delete API'),
  },
  {
    type: 'elasticsearch.connector.secret_get',
    connectorIdRequired: false,
    description: 'GET _connector/_secret/{id} - 0 parameters',
    methods: ['GET'],
    patterns: ['_connector/_secret/{id}'],
    isInternal: true,
    documentation: null,
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.secret_get API'),
  },
  {
    type: 'elasticsearch.connector.secret_post',
    connectorIdRequired: false,
    description: 'POST _connector/_secret - 0 parameters',
    methods: ['POST'],
    patterns: ['_connector/_secret'],
    isInternal: true,
    documentation: null,
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.secret_post API'),
  },
  {
    type: 'elasticsearch.connector.secret_put',
    connectorIdRequired: false,
    description: 'PUT _connector/_secret/{id} - 0 parameters',
    methods: ['PUT'],
    patterns: ['_connector/_secret/{id}'],
    isInternal: true,
    documentation: null,
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.secret_put API'),
  },
  {
    type: 'elasticsearch.connector.sync_job_cancel',
    connectorIdRequired: false,
    description: 'PUT _connector/_sync_job/{connector_sync_job_id}/_cancel - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/_sync_job/{connector_sync_job_id}/_cancel'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-cancel',
    parameterTypes: {
      pathParams: ['connector_sync_job_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      connector_sync_job_id: z
        .string()
        .describe('Path parameter: connector_sync_job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.sync_job_cancel API'),
  },
  {
    type: 'elasticsearch.connector.sync_job_check_in',
    connectorIdRequired: false,
    description: 'PUT _connector/_sync_job/{connector_sync_job_id}/_check_in - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/_sync_job/{connector_sync_job_id}/_check_in'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-check-in',
    parameterTypes: {
      pathParams: ['connector_sync_job_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      connector_sync_job_id: z
        .string()
        .describe('Path parameter: connector_sync_job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.sync_job_check_in API'),
  },
  {
    type: 'elasticsearch.connector.sync_job_claim',
    connectorIdRequired: false,
    description: 'PUT _connector/_sync_job/{connector_sync_job_id}/_claim - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/_sync_job/{connector_sync_job_id}/_claim'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-claim',
    parameterTypes: {
      pathParams: ['connector_sync_job_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      connector_sync_job_id: z
        .string()
        .describe('Path parameter: connector_sync_job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.sync_job_claim API'),
  },
  {
    type: 'elasticsearch.connector.sync_job_delete',
    connectorIdRequired: false,
    description: 'DELETE _connector/_sync_job/{connector_sync_job_id} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_connector/_sync_job/{connector_sync_job_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-delete',
    parameterTypes: {
      pathParams: ['connector_sync_job_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      connector_sync_job_id: z
        .string()
        .describe('Path parameter: connector_sync_job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.sync_job_delete API'),
  },
  {
    type: 'elasticsearch.connector.sync_job_error',
    connectorIdRequired: false,
    description: 'PUT _connector/_sync_job/{connector_sync_job_id}/_error - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/_sync_job/{connector_sync_job_id}/_error'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-error',
    parameterTypes: {
      pathParams: ['connector_sync_job_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      connector_sync_job_id: z
        .string()
        .describe('Path parameter: connector_sync_job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.sync_job_error API'),
  },
  {
    type: 'elasticsearch.connector.sync_job_get',
    connectorIdRequired: false,
    description: 'GET _connector/_sync_job/{connector_sync_job_id} - 4 parameters',
    methods: ['GET'],
    patterns: ['_connector/_sync_job/{connector_sync_job_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-get',
    parameterTypes: {
      pathParams: ['connector_sync_job_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      connector_sync_job_id: z
        .string()
        .describe('Path parameter: connector_sync_job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.sync_job_get API'),
  },
  {
    type: 'elasticsearch.connector.sync_job_list',
    connectorIdRequired: false,
    description: 'GET _connector/_sync_job - 9 parameters',
    methods: ['GET'],
    patterns: ['_connector/_sync_job'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-list',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'from',
        'size',
        'status',
        'connector_id',
        'job_type',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      size: z.union([z.string(), z.number()]).optional().describe('Parameter: size'),
      status: z
        .enum([
          'canceling',
          'canceled',
          'completed',
          'error',
          'in_progress',
          'pending',
          'suspended',
        ])
        .optional()
        .describe('Enum parameter: status'),
      connector_id: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: connector_id'),
      job_type: z
        .enum(['full', 'incremental', 'access_control'])
        .optional()
        .describe('Enum parameter: job_type'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.sync_job_list API'),
  },
  {
    type: 'elasticsearch.connector.sync_job_post',
    connectorIdRequired: false,
    description: 'POST _connector/_sync_job - 4 parameters',
    methods: ['POST'],
    patterns: ['_connector/_sync_job'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-post',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.sync_job_post API'),
  },
  {
    type: 'elasticsearch.connector.sync_job_update_stats',
    connectorIdRequired: false,
    description: 'PUT _connector/_sync_job/{connector_sync_job_id}/_stats - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/_sync_job/{connector_sync_job_id}/_stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-update-stats',
    parameterTypes: {
      pathParams: ['connector_sync_job_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      connector_sync_job_id: z
        .string()
        .describe('Path parameter: connector_sync_job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.sync_job_update_stats API'),
  },
  {
    type: 'elasticsearch.connector.update_active_filtering',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_filtering/_activate - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/{connector_id}/_filtering/_activate'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-filtering',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from connector.update_active_filtering API'),
  },
  {
    type: 'elasticsearch.connector.update_api_key_id',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_api_key_id - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/{connector_id}/_api_key_id'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-api-key-id',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from connector.update_api_key_id API'),
  },
  {
    type: 'elasticsearch.connector.update_configuration',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_configuration - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/{connector_id}/_configuration'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-configuration',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from connector.update_configuration API'),
  },
  {
    type: 'elasticsearch.connector.update_error',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_error - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/{connector_id}/_error'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-error',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from connector.update_error API'),
  },
  {
    type: 'elasticsearch.connector.update_features',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_features - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/{connector_id}/_features'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-features',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from connector.update_features API'),
  },
  {
    type: 'elasticsearch.connector.update_filtering',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_filtering - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/{connector_id}/_filtering'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-filtering',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from connector.update_filtering API'),
  },
  {
    type: 'elasticsearch.connector.update_filtering_validation',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_filtering/_validation - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/{connector_id}/_filtering/_validation'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-filtering-validation',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from connector.update_filtering_validation API'),
  },
  {
    type: 'elasticsearch.connector.update_index_name',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_index_name - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/{connector_id}/_index_name'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-index-name',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from connector.update_index_name API'),
  },
  {
    type: 'elasticsearch.connector.update_name',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_name - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/{connector_id}/_name'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-name',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from connector.update_name API'),
  },
  {
    type: 'elasticsearch.connector.update_native',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_native - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/{connector_id}/_native'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-native',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from connector.update_native API'),
  },
  {
    type: 'elasticsearch.connector.update_pipeline',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_pipeline - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/{connector_id}/_pipeline'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-pipeline',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from connector.update_pipeline API'),
  },
  {
    type: 'elasticsearch.connector.update_scheduling',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_scheduling - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/{connector_id}/_scheduling'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-scheduling',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from connector.update_scheduling API'),
  },
  {
    type: 'elasticsearch.connector.update_service_type',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_service_type - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/{connector_id}/_service_type'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-service-type',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from connector.update_service_type API'),
  },
  {
    type: 'elasticsearch.connector.update_status',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_status - 4 parameters',
    methods: ['PUT'],
    patterns: ['_connector/{connector_id}/_status'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-update-status',
    parameterTypes: {
      pathParams: ['connector_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from connector.update_status API'),
  },
  {
    type: 'elasticsearch.count',
    connectorIdRequired: false,
    description: 'POST/GET _count | {index}/_count - 18 parameters',
    methods: ['POST', 'GET'],
    patterns: ['_count', '{index}/_count'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-count',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'analyzer',
        'analyze_wildcard',
        'default_operator',
        'df',
        'expand_wildcards',
        'ignore_throttled',
        'ignore_unavailable',
        'lenient',
        'min_score',
        'preference',
        'routing',
        'terminate_after',
        'q',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      analyzer: z.union([z.string(), z.number()]).optional().describe('Parameter: analyzer'),
      analyze_wildcard: z.boolean().optional().describe('Boolean flag: analyze_wildcard'),
      default_operator: z
        .enum(['and', 'or'])
        .optional()
        .describe('Enum parameter: default_operator'),
      df: z.union([z.string(), z.number()]).optional().describe('Parameter: df'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_throttled: z.boolean().optional().describe('Boolean flag: ignore_throttled'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      lenient: z.boolean().optional().describe('Boolean flag: lenient'),
      min_score: z.union([z.string(), z.number()]).optional().describe('Parameter: min_score'),
      preference: z.union([z.string(), z.number()]).optional().describe('Parameter: preference'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      terminate_after: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: terminate_after'),
      q: z.union([z.string(), z.number()]).optional().describe('Parameter: q'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from count API'),
  },
  {
    type: 'elasticsearch.create',
    connectorIdRequired: false,
    description: 'PUT/POST {index}/_create/{id} - 17 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['{index}/_create/{id}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-create',
    parameterTypes: {
      pathParams: ['index', 'id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'if_primary_term',
        'if_seq_no',
        'include_source_on_error',
        'op_type',
        'pipeline',
        'refresh',
        'require_alias',
        'require_data_stream',
        'routing',
        'timeout',
        'version',
        'version_type',
        'wait_for_active_shards',
      ],
      bodyParams: ['document'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      if_primary_term: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: if_primary_term'),
      if_seq_no: z.union([z.string(), z.number()]).optional().describe('Parameter: if_seq_no'),
      include_source_on_error: z
        .boolean()
        .optional()
        .describe('Boolean flag: include_source_on_error'),
      op_type: z.enum(['index', 'create']).optional().describe('Enum parameter: op_type'),
      pipeline: z.union([z.string(), z.number()]).optional().describe('Parameter: pipeline'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      require_alias: z.boolean().optional().describe('Boolean flag: require_alias'),
      require_data_stream: z.boolean().optional().describe('Boolean flag: require_data_stream'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      timeout: z.enum(['1m', '-1', '0']).optional().describe('Enum parameter: timeout'),
      version: z.union([z.string(), z.number()]).optional().describe('Parameter: version'),
      version_type: z
        .enum(['internal', 'external', 'external_gte', 'force'])
        .optional()
        .describe('Enum parameter: version_type'),
      wait_for_active_shards: z
        .enum(['1', 'all', 'index-setting'])
        .optional()
        .describe('Enum parameter: wait_for_active_shards'),
      document: z.object({}).passthrough().optional().describe('Document content'),
    }),
    outputSchema: z.any().describe('Response from create API'),
  },
  {
    type: 'elasticsearch.dangling_indices.delete_dangling_index',
    connectorIdRequired: false,
    description: 'DELETE _dangling/{index_uuid} - 7 parameters',
    methods: ['DELETE'],
    patterns: ['_dangling/{index_uuid}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-dangling-indices-delete-dangling-index',
    parameterTypes: {
      pathParams: ['index_uuid'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'accept_data_loss',
        'master_timeout',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index_uuid: z.string().describe('Path parameter: index_uuid (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      accept_data_loss: z.boolean().optional().describe('Boolean flag: accept_data_loss'),
      master_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: master_timeout'),
      timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from dangling_indices.delete_dangling_index API'),
  },
  {
    type: 'elasticsearch.dangling_indices.import_dangling_index',
    connectorIdRequired: false,
    description: 'POST _dangling/{index_uuid} - 7 parameters',
    methods: ['POST'],
    patterns: ['_dangling/{index_uuid}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-dangling-indices-import-dangling-index',
    parameterTypes: {
      pathParams: ['index_uuid'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'accept_data_loss',
        'master_timeout',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index_uuid: z.string().describe('Path parameter: index_uuid (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      accept_data_loss: z.boolean().optional().describe('Boolean flag: accept_data_loss'),
      master_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: master_timeout'),
      timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from dangling_indices.import_dangling_index API'),
  },
  {
    type: 'elasticsearch.dangling_indices.list_dangling_indices',
    connectorIdRequired: false,
    description: 'GET _dangling - 4 parameters',
    methods: ['GET'],
    patterns: ['_dangling'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-dangling-indices-list-dangling-indices',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from dangling_indices.list_dangling_indices API'),
  },
  {
    type: 'elasticsearch.delete',
    connectorIdRequired: false,
    description: 'DELETE {index}/_doc/{id} - 12 parameters',
    methods: ['DELETE'],
    patterns: ['{index}/_doc/{id}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete',
    parameterTypes: {
      pathParams: ['index', 'id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'if_primary_term',
        'if_seq_no',
        'refresh',
        'routing',
        'timeout',
        'version',
        'version_type',
        'wait_for_active_shards',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      if_primary_term: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: if_primary_term'),
      if_seq_no: z.union([z.string(), z.number()]).optional().describe('Parameter: if_seq_no'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      timeout: z.enum(['1m', '-1', '0']).optional().describe('Enum parameter: timeout'),
      version: z.union([z.string(), z.number()]).optional().describe('Parameter: version'),
      version_type: z
        .enum(['internal', 'external', 'external_gte', 'force'])
        .optional()
        .describe('Enum parameter: version_type'),
      wait_for_active_shards: z
        .enum(['1', 'all', 'index-setting'])
        .optional()
        .describe('Enum parameter: wait_for_active_shards'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from delete API'),
  },
  {
    type: 'elasticsearch.delete_by_query',
    connectorIdRequired: false,
    description: 'POST {index}/_delete_by_query - 33 parameters',
    methods: ['POST'],
    patterns: ['{index}/_delete_by_query'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete-by-query',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'analyzer',
        'analyze_wildcard',
        'conflicts',
        'default_operator',
        'df',
        'expand_wildcards',
        'from',
        'ignore_unavailable',
        'lenient',
        'max_docs',
        'preference',
        'refresh',
        'request_cache',
        'requests_per_second',
        'routing',
        'q',
        'scroll',
        'scroll_size',
        'search_timeout',
        'search_type',
        'slices',
        'sort',
        'stats',
        'terminate_after',
        'timeout',
        'version',
        'wait_for_active_shards',
        'wait_for_completion',
      ],
      bodyParams: ['query', 'conflicts'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      analyzer: z.union([z.string(), z.number()]).optional().describe('Parameter: analyzer'),
      analyze_wildcard: z.boolean().optional().describe('Boolean flag: analyze_wildcard'),
      conflicts: z.enum(['abort', 'proceed']).optional().describe('Enum parameter: conflicts'),
      default_operator: z
        .enum(['and', 'or'])
        .optional()
        .describe('Enum parameter: default_operator'),
      df: z.union([z.string(), z.number()]).optional().describe('Parameter: df'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      lenient: z.boolean().optional().describe('Boolean flag: lenient'),
      max_docs: z.union([z.string(), z.number()]).optional().describe('Parameter: max_docs'),
      preference: z.union([z.string(), z.number()]).optional().describe('Parameter: preference'),
      refresh: z.boolean().optional().describe('Boolean flag: refresh'),
      request_cache: z.boolean().optional().describe('Boolean flag: request_cache'),
      requests_per_second: z
        .union([z.number(), z.array(z.number()), z.enum(['-1'])])
        .optional()
        .describe('Numeric parameter: requests_per_second'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      q: z.union([z.string(), z.number()]).optional().describe('Parameter: q'),
      scroll: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: scroll'),
      scroll_size: z
        .union([z.number(), z.array(z.number()), z.enum(['1000'])])
        .optional()
        .describe('Numeric parameter: scroll_size'),
      search_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: search_timeout'),
      search_type: z
        .enum(['query_then_fetch', 'dfs_query_then_fetch'])
        .optional()
        .describe('Enum parameter: search_type'),
      slices: z.enum(['1', 'auto']).optional().describe('Enum parameter: slices'),
      sort: z.union([z.string(), z.number()]).optional().describe('Parameter: sort'),
      stats: z.union([z.string(), z.number()]).optional().describe('Parameter: stats'),
      terminate_after: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: terminate_after'),
      timeout: z.enum(['1m', '-1', '0']).optional().describe('Enum parameter: timeout'),
      version: z.boolean().optional().describe('Boolean flag: version'),
      wait_for_active_shards: z
        .enum(['1', 'all', 'index-setting'])
        .optional()
        .describe('Enum parameter: wait_for_active_shards'),
      wait_for_completion: z.boolean().optional().describe('Boolean flag: wait_for_completion'),
      query: z
        .union([z.string(), z.object({}).passthrough()])
        .optional()
        .describe('Query (ES-QL string or Elasticsearch Query DSL)'),
    }),
    outputSchema: z.any().describe('Response from delete_by_query API'),
  },
  {
    type: 'elasticsearch.delete_by_query_rethrottle',
    connectorIdRequired: false,
    description: 'POST _delete_by_query/{task_id}/_rethrottle - 5 parameters',
    methods: ['POST'],
    patterns: ['_delete_by_query/{task_id}/_rethrottle'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete-by-query-rethrottle',
    parameterTypes: {
      pathParams: ['task_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'requests_per_second'],
      bodyParams: ['query', 'conflicts'],
    },
    paramsSchema: z.object({
      task_id: z.string().describe('Path parameter: task_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      requests_per_second: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: requests_per_second'),
      query: z
        .union([z.string(), z.object({}).passthrough()])
        .optional()
        .describe('Query (ES-QL string or Elasticsearch Query DSL)'),
      conflicts: z.enum(['abort', 'proceed']).optional().describe('Conflict resolution'),
    }),
    outputSchema: z.any().describe('Response from delete_by_query_rethrottle API'),
  },
  {
    type: 'elasticsearch.delete_script',
    connectorIdRequired: false,
    description: 'DELETE _scripts/{id} - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_scripts/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete-script',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from delete_script API'),
  },
  {
    type: 'elasticsearch.enrich.delete_policy',
    connectorIdRequired: false,
    description: 'DELETE _enrich/policy/{name} - 5 parameters',
    methods: ['DELETE'],
    patterns: ['_enrich/policy/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-delete-policy',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from enrich.delete_policy API'),
  },
  {
    type: 'elasticsearch.enrich.execute_policy',
    connectorIdRequired: false,
    description: 'PUT _enrich/policy/{name}/_execute - 6 parameters',
    methods: ['PUT'],
    patterns: ['_enrich/policy/{name}/_execute'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-execute-policy',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'master_timeout',
        'wait_for_completion',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      wait_for_completion: z.boolean().optional().describe('Boolean flag: wait_for_completion'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from enrich.execute_policy API'),
  },
  {
    type: 'elasticsearch.enrich.get_policy',
    connectorIdRequired: false,
    description: 'GET _enrich/policy/{name} | _enrich/policy - 5 parameters',
    methods: ['GET'],
    patterns: ['_enrich/policy/{name}', '_enrich/policy'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-get-policy',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from enrich.get_policy API'),
  },
  {
    type: 'elasticsearch.enrich.put_policy',
    connectorIdRequired: false,
    description: 'PUT _enrich/policy/{name} - 5 parameters',
    methods: ['PUT'],
    patterns: ['_enrich/policy/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-put-policy',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from enrich.put_policy API'),
  },
  {
    type: 'elasticsearch.enrich.stats',
    connectorIdRequired: false,
    description: 'GET _enrich/_stats - 5 parameters',
    methods: ['GET'],
    patterns: ['_enrich/_stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-stats',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from enrich.stats API'),
  },
  {
    type: 'elasticsearch.eql.delete',
    connectorIdRequired: false,
    description: 'DELETE _eql/search/{id} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_eql/search/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-eql-delete',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from eql.delete API'),
  },
  {
    type: 'elasticsearch.eql.get',
    connectorIdRequired: false,
    description: 'GET _eql/search/{id} - 6 parameters',
    methods: ['GET'],
    patterns: ['_eql/search/{id}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-eql-get',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'keep_alive',
        'wait_for_completion_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      keep_alive: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: keep_alive'),
      wait_for_completion_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: wait_for_completion_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from eql.get API'),
  },
  {
    type: 'elasticsearch.eql.get_status',
    connectorIdRequired: false,
    description: 'GET _eql/search/status/{id} - 4 parameters',
    methods: ['GET'],
    patterns: ['_eql/search/status/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-eql-get-status',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from eql.get_status API'),
  },
  {
    type: 'elasticsearch.eql.search',
    connectorIdRequired: false,
    description: 'GET/POST {index}/_eql/search - 12 parameters',
    methods: ['GET', 'POST'],
    patterns: ['{index}/_eql/search'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-eql-search',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'allow_partial_search_results',
        'allow_partial_sequence_results',
        'expand_wildcards',
        'ignore_unavailable',
        'keep_alive',
        'keep_on_completion',
        'wait_for_completion_timeout',
      ],
      bodyParams: [
        'query',
        'size',
        'from',
        'sort',
        'aggs',
        'aggregations',
        'post_filter',
        'highlight',
        '_source',
        'fields',
        'track_total_hits',
      ],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      allow_partial_search_results: z
        .boolean()
        .optional()
        .describe('Boolean flag: allow_partial_search_results'),
      allow_partial_sequence_results: z
        .boolean()
        .optional()
        .describe('Boolean flag: allow_partial_sequence_results'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      keep_alive: z.enum(['5d', '-1', '0']).optional().describe('Enum parameter: keep_alive'),
      keep_on_completion: z.boolean().optional().describe('Boolean flag: keep_on_completion'),
      wait_for_completion_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: wait_for_completion_timeout'),
      query: z
        .union([z.string(), z.object({}).passthrough()])
        .optional()
        .describe('Query (ES-QL string or Elasticsearch Query DSL)'),
      size: z.number().optional().describe('Number of results to return'),
      from: z.number().optional().describe('Starting offset'),
      sort: z
        .union([z.array(z.any()), z.object({}).passthrough()])
        .optional()
        .describe('Sort specification'),
      aggs: z.object({}).passthrough().optional().describe('Aggregations'),
      aggregations: z.object({}).passthrough().optional().describe('Aggregations'),
      post_filter: z.object({}).passthrough().optional().describe('Post filter'),
      highlight: z.object({}).passthrough().optional().describe('Highlighting configuration'),
      _source: z
        .union([z.boolean(), z.array(z.string()), z.object({}).passthrough()])
        .optional()
        .describe('Source field filtering'),
      fields: z.array(z.string()).optional().describe('Fields to return'),
      track_total_hits: z.union([z.boolean(), z.number()]).optional().describe('Track total hits'),
    }),
    outputSchema: z.any().describe('Response from eql.search API'),
  },
  {
    type: 'elasticsearch.esql.async_query',
    connectorIdRequired: false,
    description: 'POST _query/async - 8 parameters',
    methods: ['POST'],
    patterns: ['_query/async'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-async-query',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_partial_results',
        'delimiter',
        'drop_null_columns',
        'format',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_partial_results: z.boolean().optional().describe('Boolean flag: allow_partial_results'),
      delimiter: z.union([z.string(), z.number()]).optional().describe('Parameter: delimiter'),
      drop_null_columns: z.boolean().optional().describe('Boolean flag: drop_null_columns'),
      format: z
        .enum(['csv', 'json', 'tsv', 'txt', 'yaml', 'cbor', 'smile', 'arrow'])
        .optional()
        .describe('Enum parameter: format'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from esql.async_query API'),
  },
  {
    type: 'elasticsearch.esql.async_query_delete',
    connectorIdRequired: false,
    description: 'DELETE _query/async/{id} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_query/async/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-async-query-delete',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from esql.async_query_delete API'),
  },
  {
    type: 'elasticsearch.esql.async_query_get',
    connectorIdRequired: false,
    description: 'GET _query/async/{id} - 8 parameters',
    methods: ['GET'],
    patterns: ['_query/async/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-async-query-get',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'drop_null_columns',
        'format',
        'keep_alive',
        'wait_for_completion_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      drop_null_columns: z.boolean().optional().describe('Boolean flag: drop_null_columns'),
      format: z
        .enum(['csv', 'json', 'tsv', 'txt', 'yaml', 'cbor', 'smile', 'arrow'])
        .optional()
        .describe('Enum parameter: format'),
      keep_alive: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: keep_alive'),
      wait_for_completion_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: wait_for_completion_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from esql.async_query_get API'),
  },
  {
    type: 'elasticsearch.esql.async_query_stop',
    connectorIdRequired: false,
    description: 'POST _query/async/{id}/stop - 5 parameters',
    methods: ['POST'],
    patterns: ['_query/async/{id}/stop'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-esql-async-query-stop',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'drop_null_columns'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      drop_null_columns: z.boolean().optional().describe('Boolean flag: drop_null_columns'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from esql.async_query_stop API'),
  },
  {
    type: 'elasticsearch.esql.get_query',
    connectorIdRequired: false,
    description: 'GET _query/queries/{id} - 4 parameters',
    methods: ['GET'],
    patterns: ['_query/queries/{id}'],
    isInternal: true,
    documentation: null,
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from esql.get_query API'),
  },
  {
    type: 'elasticsearch.esql.list_queries',
    connectorIdRequired: false,
    description: 'GET _query/queries - 4 parameters',
    methods: ['GET'],
    patterns: ['_query/queries'],
    isInternal: true,
    documentation: null,
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from esql.list_queries API'),
  },
  {
    type: 'elasticsearch.esql.query',
    connectorIdRequired: false,
    description: 'POST _query - 8 parameters',
    methods: ['POST'],
    patterns: ['_query'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/explore-analyze/query-filter/languages/esql-rest',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'format',
        'delimiter',
        'drop_null_columns',
        'allow_partial_results',
      ],
      bodyParams: ['query', 'columnar', 'locale', 'params', 'profile', 'filter'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      format: z
        .enum(['csv', 'json', 'tsv', 'txt', 'yaml', 'cbor', 'smile', 'arrow'])
        .optional()
        .describe('Enum parameter: format'),
      delimiter: z.union([z.string(), z.number()]).optional().describe('Parameter: delimiter'),
      drop_null_columns: z.boolean().optional().describe('Boolean flag: drop_null_columns'),
      allow_partial_results: z.boolean().optional().describe('Boolean flag: allow_partial_results'),
      query: z
        .union([z.string(), z.object({}).passthrough()])
        .optional()
        .describe('Query (ES-QL string or Elasticsearch Query DSL)'),
      columnar: z.boolean().optional().describe('Return columnar results'),
      locale: z.string().optional().describe('Locale for query execution'),
      params: z.array(z.any()).optional().describe('Query parameters'),
      profile: z.boolean().optional().describe('Enable profiling'),
      filter: z.object({}).passthrough().optional().describe('Query filter'),
    }),
    outputSchema: z.any().describe('Response from esql.query API'),
  },
  {
    type: 'elasticsearch.exists',
    connectorIdRequired: false,
    description: 'HEAD {index}/_doc/{id} - 14 parameters',
    methods: ['HEAD'],
    patterns: ['{index}/_doc/{id}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get',
    parameterTypes: {
      pathParams: ['index', 'id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'preference',
        'realtime',
        'refresh',
        'routing',
        '_source',
        '_source_excludes',
        '_source_includes',
        'stored_fields',
        'version',
        'version_type',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      preference: z.union([z.string(), z.number()]).optional().describe('Parameter: preference'),
      realtime: z.boolean().optional().describe('Boolean flag: realtime'),
      refresh: z.boolean().optional().describe('Boolean flag: refresh'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      _source: z.boolean().optional().describe('Boolean flag: _source'),
      _source_excludes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_excludes'),
      _source_includes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_includes'),
      stored_fields: z.array(z.string()).optional().describe('Array parameter: stored_fields'),
      version: z.union([z.string(), z.number()]).optional().describe('Parameter: version'),
      version_type: z
        .enum(['internal', 'external', 'external_gte', 'force'])
        .optional()
        .describe('Enum parameter: version_type'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from exists API'),
  },
  {
    type: 'elasticsearch.exists_source',
    connectorIdRequired: false,
    description: 'HEAD {index}/_source/{id} - 13 parameters',
    methods: ['HEAD'],
    patterns: ['{index}/_source/{id}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get',
    parameterTypes: {
      pathParams: ['index', 'id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'preference',
        'realtime',
        'refresh',
        'routing',
        '_source',
        '_source_excludes',
        '_source_includes',
        'version',
        'version_type',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      preference: z.union([z.string(), z.number()]).optional().describe('Parameter: preference'),
      realtime: z.boolean().optional().describe('Boolean flag: realtime'),
      refresh: z.boolean().optional().describe('Boolean flag: refresh'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      _source: z.boolean().optional().describe('Boolean flag: _source'),
      _source_excludes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_excludes'),
      _source_includes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_includes'),
      version: z.union([z.string(), z.number()]).optional().describe('Parameter: version'),
      version_type: z
        .enum(['internal', 'external', 'external_gte', 'force'])
        .optional()
        .describe('Enum parameter: version_type'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from exists_source API'),
  },
  {
    type: 'elasticsearch.explain',
    connectorIdRequired: false,
    description: 'GET/POST {index}/_explain/{id} - 16 parameters',
    methods: ['GET', 'POST'],
    patterns: ['{index}/_explain/{id}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-explain',
    parameterTypes: {
      pathParams: ['index', 'id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'analyzer',
        'analyze_wildcard',
        'default_operator',
        'df',
        'lenient',
        'preference',
        'routing',
        '_source',
        '_source_excludes',
        '_source_includes',
        'stored_fields',
        'q',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      analyzer: z.union([z.string(), z.number()]).optional().describe('Parameter: analyzer'),
      analyze_wildcard: z.boolean().optional().describe('Boolean flag: analyze_wildcard'),
      default_operator: z
        .enum(['and', 'or'])
        .optional()
        .describe('Enum parameter: default_operator'),
      df: z.union([z.string(), z.number()]).optional().describe('Parameter: df'),
      lenient: z.boolean().optional().describe('Boolean flag: lenient'),
      preference: z.union([z.string(), z.number()]).optional().describe('Parameter: preference'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      _source: z.boolean().optional().describe('Boolean flag: _source'),
      _source_excludes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_excludes'),
      _source_includes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_includes'),
      stored_fields: z.array(z.string()).optional().describe('Array parameter: stored_fields'),
      q: z.union([z.string(), z.number()]).optional().describe('Parameter: q'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from explain API'),
  },
  {
    type: 'elasticsearch.features.get_features',
    connectorIdRequired: false,
    description: 'GET _features - 5 parameters',
    methods: ['GET'],
    patterns: ['_features'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-features-get-features',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from features.get_features API'),
  },
  {
    type: 'elasticsearch.features.reset_features',
    connectorIdRequired: false,
    description: 'POST _features/_reset - 5 parameters',
    methods: ['POST'],
    patterns: ['_features/_reset'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-features-reset-features',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from features.reset_features API'),
  },
  {
    type: 'elasticsearch.field_caps',
    connectorIdRequired: false,
    description: 'GET/POST _field_caps | {index}/_field_caps - 12 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_field_caps', '{index}/_field_caps'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-field-caps',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'fields',
        'ignore_unavailable',
        'include_unmapped',
        'filters',
        'types',
        'include_empty_fields',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      fields: z.array(z.string()).optional().describe('Array parameter: fields'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      include_unmapped: z.boolean().optional().describe('Boolean flag: include_unmapped'),
      filters: z.union([z.string(), z.number()]).optional().describe('Parameter: filters'),
      types: z.union([z.string(), z.number()]).optional().describe('Parameter: types'),
      include_empty_fields: z.boolean().optional().describe('Boolean flag: include_empty_fields'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from field_caps API'),
  },
  {
    type: 'elasticsearch.fleet.delete_secret',
    connectorIdRequired: false,
    description: 'DELETE _fleet/secret/{id} - 0 parameters',
    methods: ['DELETE'],
    patterns: ['_fleet/secret/{id}'],
    isInternal: true,
    documentation: null,
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from fleet.delete_secret API'),
  },
  {
    type: 'elasticsearch.fleet.get_secret',
    connectorIdRequired: false,
    description: 'GET _fleet/secret/{id} - 0 parameters',
    methods: ['GET'],
    patterns: ['_fleet/secret/{id}'],
    isInternal: true,
    documentation: null,
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from fleet.get_secret API'),
  },
  {
    type: 'elasticsearch.fleet.global_checkpoints',
    connectorIdRequired: false,
    description: 'GET {index}/_fleet/global_checkpoints - 8 parameters',
    methods: ['GET'],
    patterns: ['{index}/_fleet/global_checkpoints'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-fleet',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'wait_for_advance',
        'wait_for_index',
        'checkpoints',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      wait_for_advance: z.boolean().optional().describe('Boolean flag: wait_for_advance'),
      wait_for_index: z.boolean().optional().describe('Boolean flag: wait_for_index'),
      checkpoints: z
        .union([z.number(), z.array(z.number()), z.enum([''])])
        .optional()
        .describe('Numeric parameter: checkpoints'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from fleet.global_checkpoints API'),
  },
  {
    type: 'elasticsearch.fleet.msearch',
    connectorIdRequired: false,
    description: 'GET/POST _fleet/_fleet_msearch | {index}/_fleet/_fleet_msearch - 17 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_fleet/_fleet_msearch', '{index}/_fleet/_fleet_msearch'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-fleet-msearch',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'ccs_minimize_roundtrips',
        'expand_wildcards',
        'ignore_throttled',
        'ignore_unavailable',
        'max_concurrent_searches',
        'max_concurrent_shard_requests',
        'pre_filter_shard_size',
        'search_type',
        'rest_total_hits_as_int',
        'typed_keys',
        'wait_for_checkpoints',
        'allow_partial_search_results',
      ],
      bodyParams: [
        'query',
        'size',
        'from',
        'sort',
        'aggs',
        'aggregations',
        'post_filter',
        'highlight',
        '_source',
        'index',
      ],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      ccs_minimize_roundtrips: z
        .boolean()
        .optional()
        .describe('Boolean flag: ccs_minimize_roundtrips'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_throttled: z.boolean().optional().describe('Boolean flag: ignore_throttled'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      max_concurrent_searches: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: max_concurrent_searches'),
      max_concurrent_shard_requests: z
        .union([z.number(), z.array(z.number()), z.enum(['5'])])
        .optional()
        .describe('Numeric parameter: max_concurrent_shard_requests'),
      pre_filter_shard_size: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: pre_filter_shard_size'),
      search_type: z
        .enum(['query_then_fetch', 'dfs_query_then_fetch'])
        .optional()
        .describe('Enum parameter: search_type'),
      rest_total_hits_as_int: z
        .boolean()
        .optional()
        .describe('Boolean flag: rest_total_hits_as_int'),
      typed_keys: z.boolean().optional().describe('Boolean flag: typed_keys'),
      wait_for_checkpoints: z
        .union([z.number(), z.array(z.number()), z.enum([''])])
        .optional()
        .describe('Numeric parameter: wait_for_checkpoints'),
      allow_partial_search_results: z
        .boolean()
        .optional()
        .describe('Boolean flag: allow_partial_search_results'),
      query: z
        .union([z.string(), z.object({}).passthrough()])
        .optional()
        .describe('Query (ES-QL string or Elasticsearch Query DSL)'),
      size: z.number().optional().describe('Number of results to return'),
      from: z.number().optional().describe('Starting offset'),
      sort: z
        .union([z.array(z.any()), z.object({}).passthrough()])
        .optional()
        .describe('Sort specification'),
      aggs: z.object({}).passthrough().optional().describe('Aggregations'),
      aggregations: z.object({}).passthrough().optional().describe('Aggregations'),
      post_filter: z.object({}).passthrough().optional().describe('Post filter'),
      highlight: z.object({}).passthrough().optional().describe('Highlighting configuration'),
      _source: z
        .union([z.boolean(), z.array(z.string()), z.object({}).passthrough()])
        .optional()
        .describe('Source field filtering'),
    }),
    outputSchema: z.any().describe('Response from fleet.msearch API'),
  },
  {
    type: 'elasticsearch.fleet.post_secret',
    connectorIdRequired: false,
    description: 'POST _fleet/secret - 0 parameters',
    methods: ['POST'],
    patterns: ['_fleet/secret'],
    isInternal: true,
    documentation: null,
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from fleet.post_secret API'),
  },
  {
    type: 'elasticsearch.fleet.search',
    connectorIdRequired: false,
    description: 'GET/POST {index}/_fleet/_fleet_search - 47 parameters',
    methods: ['GET', 'POST'],
    patterns: ['{index}/_fleet/_fleet_search'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-fleet-search',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'analyzer',
        'analyze_wildcard',
        'batched_reduce_size',
        'ccs_minimize_roundtrips',
        'default_operator',
        'df',
        'docvalue_fields',
        'expand_wildcards',
        'explain',
        'ignore_throttled',
        'ignore_unavailable',
        'lenient',
        'max_concurrent_shard_requests',
        'preference',
        'pre_filter_shard_size',
        'request_cache',
        'routing',
        'scroll',
        'search_type',
        'stats',
        'stored_fields',
        'suggest_field',
        'suggest_mode',
        'suggest_size',
        'suggest_text',
        'terminate_after',
        'timeout',
        'track_total_hits',
        'track_scores',
        'typed_keys',
        'rest_total_hits_as_int',
        'version',
        '_source',
        '_source_excludes',
        '_source_includes',
        'seq_no_primary_term',
        'q',
        'size',
        'from',
        'sort',
        'wait_for_checkpoints',
        'allow_partial_search_results',
      ],
      bodyParams: [
        'query',
        'size',
        'from',
        'sort',
        'aggs',
        'aggregations',
        'post_filter',
        'highlight',
        '_source',
        'fields',
        'track_total_hits',
      ],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      analyzer: z.union([z.string(), z.number()]).optional().describe('Parameter: analyzer'),
      analyze_wildcard: z.boolean().optional().describe('Boolean flag: analyze_wildcard'),
      batched_reduce_size: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: batched_reduce_size'),
      ccs_minimize_roundtrips: z
        .boolean()
        .optional()
        .describe('Boolean flag: ccs_minimize_roundtrips'),
      default_operator: z
        .enum(['and', 'or'])
        .optional()
        .describe('Enum parameter: default_operator'),
      df: z.union([z.string(), z.number()]).optional().describe('Parameter: df'),
      docvalue_fields: z.array(z.string()).optional().describe('Array parameter: docvalue_fields'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      explain: z.boolean().optional().describe('Boolean flag: explain'),
      ignore_throttled: z.boolean().optional().describe('Boolean flag: ignore_throttled'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      lenient: z.boolean().optional().describe('Boolean flag: lenient'),
      max_concurrent_shard_requests: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: max_concurrent_shard_requests'),
      preference: z.union([z.string(), z.number()]).optional().describe('Parameter: preference'),
      pre_filter_shard_size: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: pre_filter_shard_size'),
      request_cache: z.boolean().optional().describe('Boolean flag: request_cache'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      scroll: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: scroll'),
      search_type: z
        .enum(['query_then_fetch', 'dfs_query_then_fetch'])
        .optional()
        .describe('Enum parameter: search_type'),
      stats: z.union([z.string(), z.number()]).optional().describe('Parameter: stats'),
      stored_fields: z.array(z.string()).optional().describe('Array parameter: stored_fields'),
      suggest_field: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: suggest_field'),
      suggest_mode: z
        .enum(['missing', 'popular', 'always'])
        .optional()
        .describe('Enum parameter: suggest_mode'),
      suggest_size: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: suggest_size'),
      suggest_text: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: suggest_text'),
      terminate_after: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: terminate_after'),
      timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: timeout'),
      track_total_hits: z.boolean().optional().describe('Boolean flag: track_total_hits'),
      track_scores: z.boolean().optional().describe('Boolean flag: track_scores'),
      typed_keys: z.boolean().optional().describe('Boolean flag: typed_keys'),
      rest_total_hits_as_int: z
        .boolean()
        .optional()
        .describe('Boolean flag: rest_total_hits_as_int'),
      version: z.boolean().optional().describe('Boolean flag: version'),
      _source: z.boolean().optional().describe('Boolean flag: _source'),
      _source_excludes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_excludes'),
      _source_includes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_includes'),
      seq_no_primary_term: z.boolean().optional().describe('Boolean flag: seq_no_primary_term'),
      q: z.union([z.string(), z.number()]).optional().describe('Parameter: q'),
      size: z.union([z.string(), z.number()]).optional().describe('Parameter: size'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      sort: z.array(z.string()).optional().describe('Array parameter: sort'),
      wait_for_checkpoints: z
        .union([z.number(), z.array(z.number()), z.enum([''])])
        .optional()
        .describe('Numeric parameter: wait_for_checkpoints'),
      allow_partial_search_results: z
        .boolean()
        .optional()
        .describe('Boolean flag: allow_partial_search_results'),
      query: z
        .union([z.string(), z.object({}).passthrough()])
        .optional()
        .describe('Query (ES-QL string or Elasticsearch Query DSL)'),
      aggs: z.object({}).passthrough().optional().describe('Aggregations'),
      aggregations: z.object({}).passthrough().optional().describe('Aggregations'),
      post_filter: z.object({}).passthrough().optional().describe('Post filter'),
      highlight: z.object({}).passthrough().optional().describe('Highlighting configuration'),
      fields: z.array(z.string()).optional().describe('Fields to return'),
    }),
    outputSchema: z.any().describe('Response from fleet.search API'),
  },
  {
    type: 'elasticsearch.get',
    connectorIdRequired: false,
    description: 'GET {index}/_doc/{id} - 15 parameters',
    methods: ['GET'],
    patterns: ['{index}/_doc/{id}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get',
    parameterTypes: {
      pathParams: ['index', 'id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'force_synthetic_source',
        'preference',
        'realtime',
        'refresh',
        'routing',
        '_source',
        '_source_excludes',
        '_source_includes',
        'stored_fields',
        'version',
        'version_type',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      force_synthetic_source: z
        .boolean()
        .optional()
        .describe('Boolean flag: force_synthetic_source'),
      preference: z.union([z.string(), z.number()]).optional().describe('Parameter: preference'),
      realtime: z.boolean().optional().describe('Boolean flag: realtime'),
      refresh: z.boolean().optional().describe('Boolean flag: refresh'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      _source: z.boolean().optional().describe('Boolean flag: _source'),
      _source_excludes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_excludes'),
      _source_includes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_includes'),
      stored_fields: z.array(z.string()).optional().describe('Array parameter: stored_fields'),
      version: z.union([z.string(), z.number()]).optional().describe('Parameter: version'),
      version_type: z
        .enum(['internal', 'external', 'external_gte', 'force'])
        .optional()
        .describe('Enum parameter: version_type'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from get API'),
  },
  {
    type: 'elasticsearch.get_script',
    connectorIdRequired: false,
    description: 'GET _scripts/{id} - 5 parameters',
    methods: ['GET'],
    patterns: ['_scripts/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get-script',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from get_script API'),
  },
  {
    type: 'elasticsearch.get_script_context',
    connectorIdRequired: false,
    description: 'GET _script_context - 4 parameters',
    methods: ['GET'],
    patterns: ['_script_context'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get-script-context',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from get_script_context API'),
  },
  {
    type: 'elasticsearch.get_script_languages',
    connectorIdRequired: false,
    description: 'GET _script_language - 4 parameters',
    methods: ['GET'],
    patterns: ['_script_language'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get-script-languages',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from get_script_languages API'),
  },
  {
    type: 'elasticsearch.get_source',
    connectorIdRequired: false,
    description: 'GET {index}/_source/{id} - 14 parameters',
    methods: ['GET'],
    patterns: ['{index}/_source/{id}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get',
    parameterTypes: {
      pathParams: ['index', 'id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'preference',
        'realtime',
        'refresh',
        'routing',
        '_source',
        '_source_excludes',
        '_source_includes',
        'stored_fields',
        'version',
        'version_type',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      preference: z.union([z.string(), z.number()]).optional().describe('Parameter: preference'),
      realtime: z.boolean().optional().describe('Boolean flag: realtime'),
      refresh: z.boolean().optional().describe('Boolean flag: refresh'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      _source: z.boolean().optional().describe('Boolean flag: _source'),
      _source_excludes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_excludes'),
      _source_includes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_includes'),
      stored_fields: z.array(z.string()).optional().describe('Array parameter: stored_fields'),
      version: z.union([z.string(), z.number()]).optional().describe('Parameter: version'),
      version_type: z
        .enum(['internal', 'external', 'external_gte', 'force'])
        .optional()
        .describe('Enum parameter: version_type'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from get_source API'),
  },
  {
    type: 'elasticsearch.graph.explore',
    connectorIdRequired: false,
    description: 'GET/POST {index}/_graph/explore - 6 parameters',
    methods: ['GET', 'POST'],
    patterns: ['{index}/_graph/explore'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-graph',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'routing', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from graph.explore API'),
  },
  {
    type: 'elasticsearch.health_report',
    connectorIdRequired: false,
    description: 'GET _health_report | _health_report/{feature} - 7 parameters',
    methods: ['GET'],
    patterns: ['_health_report', '_health_report/{feature}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-health-report',
    parameterTypes: {
      pathParams: ['feature'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'timeout', 'verbose', 'size'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      feature: z.string().describe('Path parameter: feature (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: timeout'),
      verbose: z.boolean().optional().describe('Boolean flag: verbose'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['1000'])])
        .optional()
        .describe('Numeric parameter: size'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from health_report API'),
  },
  {
    type: 'elasticsearch.ilm.delete_lifecycle',
    connectorIdRequired: false,
    description: 'DELETE _ilm/policy/{policy} - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_ilm/policy/{policy}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-delete-lifecycle',
    parameterTypes: {
      pathParams: ['policy'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      policy: z.string().describe('Path parameter: policy (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ilm.delete_lifecycle API'),
  },
  {
    type: 'elasticsearch.ilm.explain_lifecycle',
    connectorIdRequired: false,
    description: 'GET {index}/_ilm/explain - 7 parameters',
    methods: ['GET'],
    patterns: ['{index}/_ilm/explain'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-explain-lifecycle',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'only_errors',
        'only_managed',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      only_errors: z.boolean().optional().describe('Boolean flag: only_errors'),
      only_managed: z.boolean().optional().describe('Boolean flag: only_managed'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ilm.explain_lifecycle API'),
  },
  {
    type: 'elasticsearch.ilm.get_lifecycle',
    connectorIdRequired: false,
    description: 'GET _ilm/policy/{policy} | _ilm/policy - 6 parameters',
    methods: ['GET'],
    patterns: ['_ilm/policy/{policy}', '_ilm/policy'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-get-lifecycle',
    parameterTypes: {
      pathParams: ['policy'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      policy: z.string().describe('Path parameter: policy (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ilm.get_lifecycle API'),
  },
  {
    type: 'elasticsearch.ilm.get_status',
    connectorIdRequired: false,
    description: 'GET _ilm/status - 4 parameters',
    methods: ['GET'],
    patterns: ['_ilm/status'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-get-status',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ilm.get_status API'),
  },
  {
    type: 'elasticsearch.ilm.migrate_to_data_tiers',
    connectorIdRequired: false,
    description: 'POST _ilm/migrate_to_data_tiers - 6 parameters',
    methods: ['POST'],
    patterns: ['_ilm/migrate_to_data_tiers'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-migrate-to-data-tiers',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'dry_run', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      dry_run: z.boolean().optional().describe('Boolean flag: dry_run'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ilm.migrate_to_data_tiers API'),
  },
  {
    type: 'elasticsearch.ilm.move_to_step',
    connectorIdRequired: false,
    description: 'POST _ilm/move/{index} - 4 parameters',
    methods: ['POST'],
    patterns: ['_ilm/move/{index}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-move-to-step',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ilm.move_to_step API'),
  },
  {
    type: 'elasticsearch.ilm.put_lifecycle',
    connectorIdRequired: false,
    description: 'PUT _ilm/policy/{policy} - 6 parameters',
    methods: ['PUT'],
    patterns: ['_ilm/policy/{policy}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-put-lifecycle',
    parameterTypes: {
      pathParams: ['policy'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      policy: z.string().describe('Path parameter: policy (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ilm.put_lifecycle API'),
  },
  {
    type: 'elasticsearch.ilm.remove_policy',
    connectorIdRequired: false,
    description: 'POST {index}/_ilm/remove - 4 parameters',
    methods: ['POST'],
    patterns: ['{index}/_ilm/remove'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-remove-policy',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ilm.remove_policy API'),
  },
  {
    type: 'elasticsearch.ilm.retry',
    connectorIdRequired: false,
    description: 'POST {index}/_ilm/retry - 4 parameters',
    methods: ['POST'],
    patterns: ['{index}/_ilm/retry'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-retry',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ilm.retry API'),
  },
  {
    type: 'elasticsearch.ilm.start',
    connectorIdRequired: false,
    description: 'POST _ilm/start - 6 parameters',
    methods: ['POST'],
    patterns: ['_ilm/start'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-start',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ilm.start API'),
  },
  {
    type: 'elasticsearch.ilm.stop',
    connectorIdRequired: false,
    description: 'POST _ilm/stop - 6 parameters',
    methods: ['POST'],
    patterns: ['_ilm/stop'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-stop',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ilm.stop API'),
  },
  {
    type: 'elasticsearch.index',
    connectorIdRequired: false,
    description: 'PUT/POST {index}/_doc/{id} | {index}/_doc - 16 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['{index}/_doc/{id}', '{index}/_doc'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-create',
    parameterTypes: {
      pathParams: ['index', 'id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'if_primary_term',
        'if_seq_no',
        'include_source_on_error',
        'op_type',
        'pipeline',
        'refresh',
        'routing',
        'timeout',
        'version',
        'version_type',
        'wait_for_active_shards',
        'require_alias',
      ],
      bodyParams: ['document'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      if_primary_term: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: if_primary_term'),
      if_seq_no: z.union([z.string(), z.number()]).optional().describe('Parameter: if_seq_no'),
      include_source_on_error: z
        .boolean()
        .optional()
        .describe('Boolean flag: include_source_on_error'),
      op_type: z.enum(['index', 'create']).optional().describe('Enum parameter: op_type'),
      pipeline: z.union([z.string(), z.number()]).optional().describe('Parameter: pipeline'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      timeout: z.enum(['1m', '-1', '0']).optional().describe('Enum parameter: timeout'),
      version: z.union([z.string(), z.number()]).optional().describe('Parameter: version'),
      version_type: z
        .enum(['internal', 'external', 'external_gte', 'force'])
        .optional()
        .describe('Enum parameter: version_type'),
      wait_for_active_shards: z
        .enum(['1', 'all', 'index-setting'])
        .optional()
        .describe('Enum parameter: wait_for_active_shards'),
      require_alias: z.boolean().optional().describe('Boolean flag: require_alias'),
      document: z.object({}).passthrough().optional().describe('Document content'),
    }),
    outputSchema: z.any().describe('Response from index API'),
  },
  {
    type: 'elasticsearch.indices.add_block',
    connectorIdRequired: false,
    description: 'PUT {index}/_block/{block} - 9 parameters',
    methods: ['PUT'],
    patterns: ['{index}/_block/{block}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-add-block',
    parameterTypes: {
      pathParams: ['index', 'block'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_unavailable',
        'master_timeout',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      block: z.string().describe('Path parameter: block (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.add_block API'),
  },
  {
    type: 'elasticsearch.indices.analyze',
    connectorIdRequired: false,
    description: 'GET/POST _analyze | {index}/_analyze - 5 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_analyze', '{index}/_analyze'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-analyze',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'index'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.analyze API'),
  },
  {
    type: 'elasticsearch.indices.cancel_migrate_reindex',
    connectorIdRequired: false,
    description: 'POST _migration/reindex/{index}/_cancel - 4 parameters',
    methods: ['POST'],
    patterns: ['_migration/reindex/{index}/_cancel'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-cancel-migrate-reindex',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['source', 'dest', 'script', 'conflicts'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      source: z.object({}).passthrough().optional().describe('Source configuration'),
      dest: z.object({}).passthrough().optional().describe('Destination configuration'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      conflicts: z.enum(['abort', 'proceed']).optional().describe('Conflict resolution'),
    }),
    outputSchema: z.any().describe('Response from indices.cancel_migrate_reindex API'),
  },
  {
    type: 'elasticsearch.indices.clear_cache',
    connectorIdRequired: false,
    description: 'POST _cache/clear | {index}/_cache/clear - 12 parameters',
    methods: ['POST'],
    patterns: ['_cache/clear', '{index}/_cache/clear'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-clear-cache',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'index',
        'allow_no_indices',
        'expand_wildcards',
        'fielddata',
        'fields',
        'ignore_unavailable',
        'query',
        'request',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      fielddata: z.boolean().optional().describe('Boolean flag: fielddata'),
      fields: z.array(z.string()).optional().describe('Array parameter: fields'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      query: z.boolean().optional().describe('Boolean flag: query'),
      request: z.boolean().optional().describe('Boolean flag: request'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.clear_cache API'),
  },
  {
    type: 'elasticsearch.indices.clone',
    connectorIdRequired: false,
    description: 'PUT/POST {index}/_clone/{target} - 7 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['{index}/_clone/{target}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-clone',
    parameterTypes: {
      pathParams: ['index', 'target'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'master_timeout',
        'timeout',
        'wait_for_active_shards',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      target: z.string().describe('Path parameter: target (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      wait_for_active_shards: z
        .enum(['1', 'all', 'index-setting'])
        .optional()
        .describe('Enum parameter: wait_for_active_shards'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.clone API'),
  },
  {
    type: 'elasticsearch.indices.close',
    connectorIdRequired: false,
    description: 'POST {index}/_close - 10 parameters',
    methods: ['POST'],
    patterns: ['{index}/_close'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-close',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_unavailable',
        'master_timeout',
        'timeout',
        'wait_for_active_shards',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      wait_for_active_shards: z
        .enum(['1', 'all', 'index-setting'])
        .optional()
        .describe('Enum parameter: wait_for_active_shards'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.close API'),
  },
  {
    type: 'elasticsearch.indices.create',
    connectorIdRequired: false,
    description: 'PUT {index} - 7 parameters',
    methods: ['PUT'],
    patterns: ['{index}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'master_timeout',
        'timeout',
        'wait_for_active_shards',
      ],
      bodyParams: ['mappings', 'settings', 'aliases'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      wait_for_active_shards: z
        .enum(['1', 'all', 'index-setting'])
        .optional()
        .describe('Enum parameter: wait_for_active_shards'),
      mappings: z.object({}).passthrough().optional().describe('Index mappings'),
      settings: z.object({}).passthrough().optional().describe('Index settings'),
      aliases: z.object({}).passthrough().optional().describe('Index aliases'),
    }),
    outputSchema: z.any().describe('Response from indices.create API'),
  },
  {
    type: 'elasticsearch.indices.create_data_stream',
    connectorIdRequired: false,
    description: 'PUT _data_stream/{name} - 6 parameters',
    methods: ['PUT'],
    patterns: ['_data_stream/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create-data-stream',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.create_data_stream API'),
  },
  {
    type: 'elasticsearch.indices.create_from',
    connectorIdRequired: false,
    description: 'PUT/POST _create_from/{source}/{dest} - 4 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_create_from/{source}/{dest}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create-from',
    parameterTypes: {
      pathParams: ['source', 'dest'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['mappings', 'settings', 'aliases'],
    },
    paramsSchema: z.object({
      source: z.string().describe('Path parameter: source (required)'),
      dest: z.string().describe('Path parameter: dest (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      mappings: z.object({}).passthrough().optional().describe('Index mappings'),
      settings: z.object({}).passthrough().optional().describe('Index settings'),
      aliases: z.object({}).passthrough().optional().describe('Index aliases'),
    }),
    outputSchema: z.any().describe('Response from indices.create_from API'),
  },
  {
    type: 'elasticsearch.indices.data_streams_stats',
    connectorIdRequired: false,
    description: 'GET _data_stream/_stats | _data_stream/{name}/_stats - 5 parameters',
    methods: ['GET'],
    patterns: ['_data_stream/_stats', '_data_stream/{name}/_stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-data-streams-stats-1',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'expand_wildcards'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.data_streams_stats API'),
  },
  {
    type: 'elasticsearch.indices.delete',
    connectorIdRequired: false,
    description: 'DELETE {index} - 9 parameters',
    methods: ['DELETE'],
    patterns: ['{index}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_unavailable',
        'master_timeout',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.delete API'),
  },
  {
    type: 'elasticsearch.indices.delete_alias',
    connectorIdRequired: false,
    description: 'DELETE {index}/_alias/{name} | {index}/_aliases/{name} - 6 parameters',
    methods: ['DELETE'],
    patterns: ['{index}/_alias/{name}', '{index}/_aliases/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-alias',
    parameterTypes: {
      pathParams: ['index', 'name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.delete_alias API'),
  },
  {
    type: 'elasticsearch.indices.delete_data_lifecycle',
    connectorIdRequired: false,
    description: 'DELETE _data_stream/{name}/_lifecycle - 7 parameters',
    methods: ['DELETE'],
    patterns: ['_data_stream/{name}/_lifecycle'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-data-lifecycle',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'expand_wildcards',
        'master_timeout',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      master_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: master_timeout'),
      timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.delete_data_lifecycle API'),
  },
  {
    type: 'elasticsearch.indices.delete_data_stream',
    connectorIdRequired: false,
    description: 'DELETE _data_stream/{name} - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_data_stream/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-data-stream',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'master_timeout',
        'expand_wildcards',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.delete_data_stream API'),
  },
  {
    type: 'elasticsearch.indices.delete_data_stream_options',
    connectorIdRequired: false,
    description: 'DELETE _data_stream/{name}/_options - 7 parameters',
    methods: ['DELETE'],
    patterns: ['_data_stream/{name}/_options'],
    isInternal: true,
    documentation: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'expand_wildcards',
        'master_timeout',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      master_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: master_timeout'),
      timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.delete_data_stream_options API'),
  },
  {
    type: 'elasticsearch.indices.delete_index_template',
    connectorIdRequired: false,
    description: 'DELETE _index_template/{name} - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_index_template/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-index-template',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.delete_index_template API'),
  },
  {
    type: 'elasticsearch.indices.delete_template',
    connectorIdRequired: false,
    description: 'DELETE _template/{name} - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_template/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-template',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.delete_template API'),
  },
  {
    type: 'elasticsearch.indices.disk_usage',
    connectorIdRequired: false,
    description: 'POST {index}/_disk_usage - 9 parameters',
    methods: ['POST'],
    patterns: ['{index}/_disk_usage'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-disk-usage',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'flush',
        'ignore_unavailable',
        'run_expensive_tasks',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      flush: z.boolean().optional().describe('Boolean flag: flush'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      run_expensive_tasks: z.boolean().optional().describe('Boolean flag: run_expensive_tasks'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.disk_usage API'),
  },
  {
    type: 'elasticsearch.indices.downsample',
    connectorIdRequired: false,
    description: 'POST {index}/_downsample/{target_index} - 4 parameters',
    methods: ['POST'],
    patterns: ['{index}/_downsample/{target_index}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-downsample',
    parameterTypes: {
      pathParams: ['index', 'target_index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      target_index: z.string().describe('Path parameter: target_index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.downsample API'),
  },
  {
    type: 'elasticsearch.indices.exists',
    connectorIdRequired: false,
    description: 'HEAD {index} - 10 parameters',
    methods: ['HEAD'],
    patterns: ['{index}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-exists',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'flat_settings',
        'ignore_unavailable',
        'include_defaults',
        'local',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      flat_settings: z.boolean().optional().describe('Boolean flag: flat_settings'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      include_defaults: z.boolean().optional().describe('Boolean flag: include_defaults'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.exists API'),
  },
  {
    type: 'elasticsearch.indices.exists_alias',
    connectorIdRequired: false,
    description: 'HEAD _alias/{name} | {index}/_alias/{name} - 8 parameters',
    methods: ['HEAD'],
    patterns: ['_alias/{name}', '{index}/_alias/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-exists-alias',
    parameterTypes: {
      pathParams: ['name', 'index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_unavailable',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.exists_alias API'),
  },
  {
    type: 'elasticsearch.indices.exists_index_template',
    connectorIdRequired: false,
    description: 'HEAD _index_template/{name} - 7 parameters',
    methods: ['HEAD'],
    patterns: ['_index_template/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-exists-index-template',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'local',
        'flat_settings',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      flat_settings: z.boolean().optional().describe('Boolean flag: flat_settings'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.exists_index_template API'),
  },
  {
    type: 'elasticsearch.indices.exists_template',
    connectorIdRequired: false,
    description: 'HEAD _template/{name} - 7 parameters',
    methods: ['HEAD'],
    patterns: ['_template/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-exists-template',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'flat_settings',
        'local',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      flat_settings: z.boolean().optional().describe('Boolean flag: flat_settings'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.exists_template API'),
  },
  {
    type: 'elasticsearch.indices.explain_data_lifecycle',
    connectorIdRequired: false,
    description: 'GET {index}/_lifecycle/explain - 6 parameters',
    methods: ['GET'],
    patterns: ['{index}/_lifecycle/explain'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-explain-data-lifecycle',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'include_defaults',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      include_defaults: z.boolean().optional().describe('Boolean flag: include_defaults'),
      master_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.explain_data_lifecycle API'),
  },
  {
    type: 'elasticsearch.indices.field_usage_stats',
    connectorIdRequired: false,
    description: 'GET {index}/_field_usage_stats - 8 parameters',
    methods: ['GET'],
    patterns: ['{index}/_field_usage_stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-field-usage-stats',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_unavailable',
        'fields',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      fields: z.array(z.string()).optional().describe('Array parameter: fields'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.field_usage_stats API'),
  },
  {
    type: 'elasticsearch.indices.flush',
    connectorIdRequired: false,
    description: 'POST/GET _flush | {index}/_flush - 9 parameters',
    methods: ['POST', 'GET'],
    patterns: ['_flush', '{index}/_flush'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-flush',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'force',
        'ignore_unavailable',
        'wait_if_ongoing',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      force: z.boolean().optional().describe('Boolean flag: force'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      wait_if_ongoing: z.boolean().optional().describe('Boolean flag: wait_if_ongoing'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.flush API'),
  },
  {
    type: 'elasticsearch.indices.forcemerge',
    connectorIdRequired: false,
    description: 'POST _forcemerge | {index}/_forcemerge - 11 parameters',
    methods: ['POST'],
    patterns: ['_forcemerge', '{index}/_forcemerge'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-forcemerge',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'flush',
        'ignore_unavailable',
        'max_num_segments',
        'only_expunge_deletes',
        'wait_for_completion',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      flush: z.boolean().optional().describe('Boolean flag: flush'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      max_num_segments: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: max_num_segments'),
      only_expunge_deletes: z.boolean().optional().describe('Boolean flag: only_expunge_deletes'),
      wait_for_completion: z.boolean().optional().describe('Boolean flag: wait_for_completion'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.forcemerge API'),
  },
  {
    type: 'elasticsearch.indices.get',
    connectorIdRequired: false,
    description: 'GET {index} - 12 parameters',
    methods: ['GET'],
    patterns: ['{index}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'flat_settings',
        'ignore_unavailable',
        'include_defaults',
        'local',
        'master_timeout',
        'features',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      flat_settings: z.boolean().optional().describe('Boolean flag: flat_settings'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      include_defaults: z.boolean().optional().describe('Boolean flag: include_defaults'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      features: z
        .enum(['aliases', 'mappings', 'settings'])
        .optional()
        .describe('Enum parameter: features'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.get API'),
  },
  {
    type: 'elasticsearch.indices.get_alias',
    connectorIdRequired: false,
    description:
      'GET _alias | _alias/{name} | {index}/_alias/{name} | {index}/_alias - 8 parameters',
    methods: ['GET'],
    patterns: ['_alias', '_alias/{name}', '{index}/_alias/{name}', '{index}/_alias'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-alias',
    parameterTypes: {
      pathParams: ['name', 'index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_unavailable',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.get_alias API'),
  },
  {
    type: 'elasticsearch.indices.get_data_lifecycle',
    connectorIdRequired: false,
    description: 'GET _data_stream/{name}/_lifecycle - 7 parameters',
    methods: ['GET'],
    patterns: ['_data_stream/{name}/_lifecycle'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-lifecycle',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'expand_wildcards',
        'include_defaults',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      include_defaults: z.boolean().optional().describe('Boolean flag: include_defaults'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.get_data_lifecycle API'),
  },
  {
    type: 'elasticsearch.indices.get_data_lifecycle_stats',
    connectorIdRequired: false,
    description: 'GET _lifecycle/stats - 4 parameters',
    methods: ['GET'],
    patterns: ['_lifecycle/stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-lifecycle-stats',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.get_data_lifecycle_stats API'),
  },
  {
    type: 'elasticsearch.indices.get_data_stream',
    connectorIdRequired: false,
    description: 'GET _data_stream | _data_stream/{name} - 8 parameters',
    methods: ['GET'],
    patterns: ['_data_stream', '_data_stream/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-stream',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'expand_wildcards',
        'include_defaults',
        'master_timeout',
        'verbose',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      include_defaults: z.boolean().optional().describe('Boolean flag: include_defaults'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      verbose: z.boolean().optional().describe('Boolean flag: verbose'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.get_data_stream API'),
  },
  {
    type: 'elasticsearch.indices.get_data_stream_mappings',
    connectorIdRequired: false,
    description: 'GET _data_stream/{name}/_mappings - 0 parameters',
    methods: ['GET'],
    patterns: ['_data_stream/{name}/_mappings'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/data-streams.html',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.get_data_stream_mappings API'),
  },
  {
    type: 'elasticsearch.indices.get_data_stream_options',
    connectorIdRequired: false,
    description: 'GET _data_stream/{name}/_options - 6 parameters',
    methods: ['GET'],
    patterns: ['_data_stream/{name}/_options'],
    isInternal: true,
    documentation: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'expand_wildcards',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.get_data_stream_options API'),
  },
  {
    type: 'elasticsearch.indices.get_data_stream_settings',
    connectorIdRequired: false,
    description: 'GET _data_stream/{name}/_settings - 5 parameters',
    methods: ['GET'],
    patterns: ['_data_stream/{name}/_settings'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-stream-settings',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.get_data_stream_settings API'),
  },
  {
    type: 'elasticsearch.indices.get_field_mapping',
    connectorIdRequired: false,
    description: 'GET _mapping/field/{fields} | {index}/_mapping/field/{fields} - 8 parameters',
    methods: ['GET'],
    patterns: ['_mapping/field/{fields}', '{index}/_mapping/field/{fields}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-mapping',
    parameterTypes: {
      pathParams: ['fields', 'index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_unavailable',
        'include_defaults',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      fields: z.string().describe('Path parameter: fields (required)'),
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      include_defaults: z.boolean().optional().describe('Boolean flag: include_defaults'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.get_field_mapping API'),
  },
  {
    type: 'elasticsearch.indices.get_index_template',
    connectorIdRequired: false,
    description: 'GET _index_template | _index_template/{name} - 8 parameters',
    methods: ['GET'],
    patterns: ['_index_template', '_index_template/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-index-template',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'local',
        'flat_settings',
        'master_timeout',
        'include_defaults',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      flat_settings: z.boolean().optional().describe('Boolean flag: flat_settings'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      include_defaults: z.boolean().optional().describe('Boolean flag: include_defaults'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.get_index_template API'),
  },
  {
    type: 'elasticsearch.indices.get_mapping',
    connectorIdRequired: false,
    description: 'GET _mapping | {index}/_mapping - 9 parameters',
    methods: ['GET'],
    patterns: ['_mapping', '{index}/_mapping'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-mapping',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_unavailable',
        'local',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.get_mapping API'),
  },
  {
    type: 'elasticsearch.indices.get_migrate_reindex_status',
    connectorIdRequired: false,
    description: 'GET _migration/reindex/{index}/_status - 4 parameters',
    methods: ['GET'],
    patterns: ['_migration/reindex/{index}/_status'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-migration',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['source', 'dest', 'script', 'conflicts'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      source: z.object({}).passthrough().optional().describe('Source configuration'),
      dest: z.object({}).passthrough().optional().describe('Destination configuration'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      conflicts: z.enum(['abort', 'proceed']).optional().describe('Conflict resolution'),
    }),
    outputSchema: z.any().describe('Response from indices.get_migrate_reindex_status API'),
  },
  {
    type: 'elasticsearch.indices.get_settings',
    connectorIdRequired: false,
    description:
      'GET _settings | {index}/_settings | {index}/_settings/{name} | _settings/{name} - 11 parameters',
    methods: ['GET'],
    patterns: ['_settings', '{index}/_settings', '{index}/_settings/{name}', '_settings/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-settings',
    parameterTypes: {
      pathParams: ['index', 'name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'flat_settings',
        'ignore_unavailable',
        'include_defaults',
        'local',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      flat_settings: z.boolean().optional().describe('Boolean flag: flat_settings'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      include_defaults: z.boolean().optional().describe('Boolean flag: include_defaults'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.get_settings API'),
  },
  {
    type: 'elasticsearch.indices.get_template',
    connectorIdRequired: false,
    description: 'GET _template | _template/{name} - 7 parameters',
    methods: ['GET'],
    patterns: ['_template', '_template/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-template',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'flat_settings',
        'local',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      flat_settings: z.boolean().optional().describe('Boolean flag: flat_settings'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.get_template API'),
  },
  {
    type: 'elasticsearch.indices.migrate_reindex',
    connectorIdRequired: false,
    description: 'POST _migration/reindex - 4 parameters',
    methods: ['POST'],
    patterns: ['_migration/reindex'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-migrate-reindex',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['source', 'dest', 'script', 'conflicts'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      source: z.object({}).passthrough().optional().describe('Source configuration'),
      dest: z.object({}).passthrough().optional().describe('Destination configuration'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      conflicts: z.enum(['abort', 'proceed']).optional().describe('Conflict resolution'),
    }),
    outputSchema: z.any().describe('Response from indices.migrate_reindex API'),
  },
  {
    type: 'elasticsearch.indices.migrate_to_data_stream',
    connectorIdRequired: false,
    description: 'POST _data_stream/_migrate/{name} - 6 parameters',
    methods: ['POST'],
    patterns: ['_data_stream/_migrate/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-migrate-to-data-stream',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.migrate_to_data_stream API'),
  },
  {
    type: 'elasticsearch.indices.modify_data_stream',
    connectorIdRequired: false,
    description: 'POST _data_stream/_modify - 4 parameters',
    methods: ['POST'],
    patterns: ['_data_stream/_modify'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-modify-data-stream',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.modify_data_stream API'),
  },
  {
    type: 'elasticsearch.indices.open',
    connectorIdRequired: false,
    description: 'POST {index}/_open - 10 parameters',
    methods: ['POST'],
    patterns: ['{index}/_open'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-open',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_unavailable',
        'master_timeout',
        'timeout',
        'wait_for_active_shards',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      wait_for_active_shards: z
        .enum(['1', 'all', 'index-setting'])
        .optional()
        .describe('Enum parameter: wait_for_active_shards'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.open API'),
  },
  {
    type: 'elasticsearch.indices.promote_data_stream',
    connectorIdRequired: false,
    description: 'POST _data_stream/_promote/{name} - 5 parameters',
    methods: ['POST'],
    patterns: ['_data_stream/_promote/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-promote-data-stream',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.promote_data_stream API'),
  },
  {
    type: 'elasticsearch.indices.put_alias',
    connectorIdRequired: false,
    description: 'PUT/POST {index}/_alias/{name} | {index}/_aliases/{name} - 6 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['{index}/_alias/{name}', '{index}/_aliases/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-alias',
    parameterTypes: {
      pathParams: ['index', 'name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.put_alias API'),
  },
  {
    type: 'elasticsearch.indices.put_data_lifecycle',
    connectorIdRequired: false,
    description: 'PUT _data_stream/{name}/_lifecycle - 7 parameters',
    methods: ['PUT'],
    patterns: ['_data_stream/{name}/_lifecycle'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-data-lifecycle',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'expand_wildcards',
        'master_timeout',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.put_data_lifecycle API'),
  },
  {
    type: 'elasticsearch.indices.put_data_stream_mappings',
    connectorIdRequired: false,
    description: 'PUT _data_stream/{name}/_mappings - 0 parameters',
    methods: ['PUT'],
    patterns: ['_data_stream/{name}/_mappings'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/data-streams.html',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.put_data_stream_mappings API'),
  },
  {
    type: 'elasticsearch.indices.put_data_stream_options',
    connectorIdRequired: false,
    description: 'PUT _data_stream/{name}/_options - 7 parameters',
    methods: ['PUT'],
    patterns: ['_data_stream/{name}/_options'],
    isInternal: true,
    documentation: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'expand_wildcards',
        'master_timeout',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.put_data_stream_options API'),
  },
  {
    type: 'elasticsearch.indices.put_data_stream_settings',
    connectorIdRequired: false,
    description: 'PUT _data_stream/{name}/_settings - 7 parameters',
    methods: ['PUT'],
    patterns: ['_data_stream/{name}/_settings'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-data-stream-settings',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'dry_run',
        'master_timeout',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      dry_run: z.boolean().optional().describe('Boolean flag: dry_run'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.put_data_stream_settings API'),
  },
  {
    type: 'elasticsearch.indices.put_index_template',
    connectorIdRequired: false,
    description: 'PUT/POST _index_template/{name} - 7 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_index_template/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-index-template',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'create',
        'master_timeout',
        'cause',
      ],
      bodyParams: ['template', 'composed_of', 'priority', 'version'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      create: z.boolean().optional().describe('Boolean flag: create'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      cause: z.union([z.string(), z.number()]).optional().describe('Parameter: cause'),
      template: z.object({}).passthrough().optional().describe('Template configuration'),
      composed_of: z.array(z.string()).optional().describe('Component templates'),
      priority: z.number().optional().describe('Template priority'),
      version: z.number().optional().describe('Template version'),
    }),
    outputSchema: z.any().describe('Response from indices.put_index_template API'),
  },
  {
    type: 'elasticsearch.indices.put_mapping',
    connectorIdRequired: false,
    description: 'PUT/POST {index}/_mapping - 10 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['{index}/_mapping'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-mapping',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_unavailable',
        'master_timeout',
        'timeout',
        'write_index_only',
      ],
      bodyParams: ['properties', 'dynamic', 'meta'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      write_index_only: z.boolean().optional().describe('Boolean flag: write_index_only'),
      properties: z.object({}).passthrough().optional().describe('Mapping properties'),
      dynamic: z
        .union([z.boolean(), z.enum(['strict'])])
        .optional()
        .describe('Dynamic mapping'),
      meta: z.object({}).passthrough().optional().describe('Mapping metadata'),
    }),
    outputSchema: z.any().describe('Response from indices.put_mapping API'),
  },
  {
    type: 'elasticsearch.indices.put_settings',
    connectorIdRequired: false,
    description: 'PUT _settings | {index}/_settings - 12 parameters',
    methods: ['PUT'],
    patterns: ['_settings', '{index}/_settings'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-settings',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'flat_settings',
        'ignore_unavailable',
        'master_timeout',
        'preserve_existing',
        'reopen',
        'timeout',
      ],
      bodyParams: ['settings'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      flat_settings: z.boolean().optional().describe('Boolean flag: flat_settings'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      preserve_existing: z.boolean().optional().describe('Boolean flag: preserve_existing'),
      reopen: z.boolean().optional().describe('Boolean flag: reopen'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      settings: z.object({}).passthrough().optional().describe('Index settings'),
    }),
    outputSchema: z.any().describe('Response from indices.put_settings API'),
  },
  {
    type: 'elasticsearch.indices.put_template',
    connectorIdRequired: false,
    description: 'PUT/POST _template/{name} - 8 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_template/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-template',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'create',
        'master_timeout',
        'order',
        'cause',
      ],
      bodyParams: ['template', 'mappings', 'settings', 'aliases'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      create: z.boolean().optional().describe('Boolean flag: create'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      order: z.union([z.string(), z.number()]).optional().describe('Parameter: order'),
      cause: z.union([z.string(), z.number()]).optional().describe('Parameter: cause'),
      template: z.object({}).passthrough().optional().describe('Template configuration'),
      mappings: z.object({}).passthrough().optional().describe('Index mappings'),
      settings: z.object({}).passthrough().optional().describe('Index settings'),
      aliases: z.object({}).passthrough().optional().describe('Index aliases'),
    }),
    outputSchema: z.any().describe('Response from indices.put_template API'),
  },
  {
    type: 'elasticsearch.indices.recovery',
    connectorIdRequired: false,
    description: 'GET _recovery | {index}/_recovery - 6 parameters',
    methods: ['GET'],
    patterns: ['_recovery', '{index}/_recovery'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-recovery',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'active_only', 'detailed'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      active_only: z.boolean().optional().describe('Boolean flag: active_only'),
      detailed: z.boolean().optional().describe('Boolean flag: detailed'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.recovery API'),
  },
  {
    type: 'elasticsearch.indices.refresh',
    connectorIdRequired: false,
    description: 'POST/GET _refresh | {index}/_refresh - 7 parameters',
    methods: ['POST', 'GET'],
    patterns: ['_refresh', '{index}/_refresh'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-refresh',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_unavailable',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.refresh API'),
  },
  {
    type: 'elasticsearch.indices.reload_search_analyzers',
    connectorIdRequired: false,
    description: 'GET/POST {index}/_reload_search_analyzers - 8 parameters',
    methods: ['GET', 'POST'],
    patterns: ['{index}/_reload_search_analyzers'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-reload-search-analyzers',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_unavailable',
        'resource',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      resource: z.union([z.string(), z.number()]).optional().describe('Parameter: resource'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.reload_search_analyzers API'),
  },
  {
    type: 'elasticsearch.indices.remove_block',
    connectorIdRequired: false,
    description: 'DELETE {index}/_block/{block} - 9 parameters',
    methods: ['DELETE'],
    patterns: ['{index}/_block/{block}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-remove-block',
    parameterTypes: {
      pathParams: ['index', 'block'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_unavailable',
        'master_timeout',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      block: z.string().describe('Path parameter: block (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.remove_block API'),
  },
  {
    type: 'elasticsearch.indices.resolve_cluster',
    connectorIdRequired: false,
    description: 'GET _resolve/cluster | _resolve/cluster/{name} - 9 parameters',
    methods: ['GET'],
    patterns: ['_resolve/cluster', '_resolve/cluster/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-resolve-cluster',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_throttled',
        'ignore_unavailable',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_throttled: z.boolean().optional().describe('Boolean flag: ignore_throttled'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.resolve_cluster API'),
  },
  {
    type: 'elasticsearch.indices.resolve_index',
    connectorIdRequired: false,
    description: 'GET _resolve/index/{name} - 7 parameters',
    methods: ['GET'],
    patterns: ['_resolve/index/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-resolve-index',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'expand_wildcards',
        'ignore_unavailable',
        'allow_no_indices',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.resolve_index API'),
  },
  {
    type: 'elasticsearch.indices.rollover',
    connectorIdRequired: false,
    description: 'POST {alias}/_rollover | {alias}/_rollover/{new_index} - 9 parameters',
    methods: ['POST'],
    patterns: ['{alias}/_rollover', '{alias}/_rollover/{new_index}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-rollover',
    parameterTypes: {
      pathParams: ['alias', 'new_index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'dry_run',
        'master_timeout',
        'timeout',
        'wait_for_active_shards',
        'lazy',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      alias: z.string().describe('Path parameter: alias (required)'),
      new_index: z.string().describe('Path parameter: new_index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      dry_run: z.boolean().optional().describe('Boolean flag: dry_run'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      wait_for_active_shards: z
        .enum(['1', 'all', 'index-setting'])
        .optional()
        .describe('Enum parameter: wait_for_active_shards'),
      lazy: z.boolean().optional().describe('Boolean flag: lazy'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.rollover API'),
  },
  {
    type: 'elasticsearch.indices.segments',
    connectorIdRequired: false,
    description: 'GET _segments | {index}/_segments - 7 parameters',
    methods: ['GET'],
    patterns: ['_segments', '{index}/_segments'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-segments',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_unavailable',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.segments API'),
  },
  {
    type: 'elasticsearch.indices.shard_stores',
    connectorIdRequired: false,
    description: 'GET _shard_stores | {index}/_shard_stores - 8 parameters',
    methods: ['GET'],
    patterns: ['_shard_stores', '{index}/_shard_stores'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-shard-stores',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_unavailable',
        'status',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      status: z
        .enum(['green', 'yellow', 'red', 'all'])
        .optional()
        .describe('Enum parameter: status'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.shard_stores API'),
  },
  {
    type: 'elasticsearch.indices.shrink',
    connectorIdRequired: false,
    description: 'PUT/POST {index}/_shrink/{target} - 7 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['{index}/_shrink/{target}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-shrink',
    parameterTypes: {
      pathParams: ['index', 'target'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'master_timeout',
        'timeout',
        'wait_for_active_shards',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      target: z.string().describe('Path parameter: target (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      wait_for_active_shards: z
        .enum(['1', 'all', 'index-setting'])
        .optional()
        .describe('Enum parameter: wait_for_active_shards'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.shrink API'),
  },
  {
    type: 'elasticsearch.indices.simulate_index_template',
    connectorIdRequired: false,
    description: 'POST _index_template/_simulate_index/{name} - 8 parameters',
    methods: ['POST'],
    patterns: ['_index_template/_simulate_index/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-simulate-index-template',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'create',
        'cause',
        'master_timeout',
        'include_defaults',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      create: z.boolean().optional().describe('Boolean flag: create'),
      cause: z.enum(['false']).optional().describe('Enum parameter: cause'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      include_defaults: z.boolean().optional().describe('Boolean flag: include_defaults'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.simulate_index_template API'),
  },
  {
    type: 'elasticsearch.indices.simulate_template',
    connectorIdRequired: false,
    description: 'POST _index_template/_simulate | _index_template/_simulate/{name} - 8 parameters',
    methods: ['POST'],
    patterns: ['_index_template/_simulate', '_index_template/_simulate/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-simulate-template',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'create',
        'cause',
        'master_timeout',
        'include_defaults',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      create: z.boolean().optional().describe('Boolean flag: create'),
      cause: z.union([z.string(), z.number()]).optional().describe('Parameter: cause'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      include_defaults: z.boolean().optional().describe('Boolean flag: include_defaults'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.simulate_template API'),
  },
  {
    type: 'elasticsearch.indices.split',
    connectorIdRequired: false,
    description: 'PUT/POST {index}/_split/{target} - 7 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['{index}/_split/{target}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-split',
    parameterTypes: {
      pathParams: ['index', 'target'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'master_timeout',
        'timeout',
        'wait_for_active_shards',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      target: z.string().describe('Path parameter: target (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      wait_for_active_shards: z
        .enum(['1', 'all', 'index-setting'])
        .optional()
        .describe('Enum parameter: wait_for_active_shards'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.split API'),
  },
  {
    type: 'elasticsearch.indices.stats',
    connectorIdRequired: false,
    description:
      'GET _stats | _stats/{metric} | {index}/_stats | {index}/_stats/{metric} - 13 parameters',
    methods: ['GET'],
    patterns: ['_stats', '_stats/{metric}', '{index}/_stats', '{index}/_stats/{metric}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-stats',
    parameterTypes: {
      pathParams: ['metric', 'index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'completion_fields',
        'expand_wildcards',
        'fielddata_fields',
        'fields',
        'forbid_closed_indices',
        'groups',
        'include_segment_file_sizes',
        'include_unloaded_segments',
        'level',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      metric: z.string().describe('Path parameter: metric (required)'),
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      completion_fields: z
        .array(z.string())
        .optional()
        .describe('Array parameter: completion_fields'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      fielddata_fields: z
        .array(z.string())
        .optional()
        .describe('Array parameter: fielddata_fields'),
      fields: z.array(z.string()).optional().describe('Array parameter: fields'),
      forbid_closed_indices: z.boolean().optional().describe('Boolean flag: forbid_closed_indices'),
      groups: z.array(z.string()).optional().describe('Array parameter: groups'),
      include_segment_file_sizes: z
        .boolean()
        .optional()
        .describe('Boolean flag: include_segment_file_sizes'),
      include_unloaded_segments: z
        .boolean()
        .optional()
        .describe('Boolean flag: include_unloaded_segments'),
      level: z.enum(['cluster', 'indices', 'shards']).optional().describe('Enum parameter: level'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.stats API'),
  },
  {
    type: 'elasticsearch.indices.update_aliases',
    connectorIdRequired: false,
    description: 'POST _aliases - 6 parameters',
    methods: ['POST'],
    patterns: ['_aliases'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-update-aliases',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from indices.update_aliases API'),
  },
  {
    type: 'elasticsearch.indices.validate_query',
    connectorIdRequired: false,
    description: 'GET/POST _validate/query | {index}/_validate/query - 16 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_validate/query', '{index}/_validate/query'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-validate-query',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'all_shards',
        'analyzer',
        'analyze_wildcard',
        'default_operator',
        'df',
        'expand_wildcards',
        'explain',
        'ignore_unavailable',
        'lenient',
        'rewrite',
        'q',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      all_shards: z.boolean().optional().describe('Boolean flag: all_shards'),
      analyzer: z.union([z.string(), z.number()]).optional().describe('Parameter: analyzer'),
      analyze_wildcard: z.boolean().optional().describe('Boolean flag: analyze_wildcard'),
      default_operator: z
        .enum(['and', 'or'])
        .optional()
        .describe('Enum parameter: default_operator'),
      df: z.union([z.string(), z.number()]).optional().describe('Parameter: df'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      explain: z.boolean().optional().describe('Boolean flag: explain'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      lenient: z.boolean().optional().describe('Boolean flag: lenient'),
      rewrite: z.boolean().optional().describe('Boolean flag: rewrite'),
      q: z.union([z.string(), z.number()]).optional().describe('Parameter: q'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.validate_query API'),
  },
  {
    type: 'elasticsearch.inference.chat_completion_unified',
    connectorIdRequired: false,
    description: 'POST _inference/chat_completion/{inference_id}/_stream - 5 parameters',
    methods: ['POST'],
    patterns: ['_inference/chat_completion/{inference_id}/_stream'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-unified-inference',
    parameterTypes: {
      pathParams: ['inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      inference_id: z.string().describe('Path parameter: inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.chat_completion_unified API'),
  },
  {
    type: 'elasticsearch.inference.completion',
    connectorIdRequired: false,
    description: 'POST _inference/completion/{inference_id} - 5 parameters',
    methods: ['POST'],
    patterns: ['_inference/completion/{inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-inference',
    parameterTypes: {
      pathParams: ['inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      inference_id: z.string().describe('Path parameter: inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.completion API'),
  },
  {
    type: 'elasticsearch.inference.delete',
    connectorIdRequired: false,
    description:
      'DELETE _inference/{inference_id} | _inference/{task_type}/{inference_id} - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_inference/{inference_id}', '_inference/{task_type}/{inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-delete',
    parameterTypes: {
      pathParams: ['inference_id', 'task_type'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'dry_run', 'force'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      inference_id: z.string().describe('Path parameter: inference_id (required)'),
      task_type: z.string().describe('Path parameter: task_type (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      dry_run: z.boolean().optional().describe('Boolean flag: dry_run'),
      force: z.boolean().optional().describe('Boolean flag: force'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.delete API'),
  },
  {
    type: 'elasticsearch.inference.get',
    connectorIdRequired: false,
    description:
      'GET _inference | _inference/{inference_id} | _inference/{task_type}/{inference_id} - 4 parameters',
    methods: ['GET'],
    patterns: ['_inference', '_inference/{inference_id}', '_inference/{task_type}/{inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-get',
    parameterTypes: {
      pathParams: ['inference_id', 'task_type'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      inference_id: z.string().describe('Path parameter: inference_id (required)'),
      task_type: z.string().describe('Path parameter: task_type (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.get API'),
  },
  {
    type: 'elasticsearch.inference.inference',
    connectorIdRequired: false,
    description:
      'POST _inference/{inference_id} | _inference/{task_type}/{inference_id} - 5 parameters',
    methods: ['POST'],
    patterns: ['_inference/{inference_id}', '_inference/{task_type}/{inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-inference',
    parameterTypes: {
      pathParams: ['inference_id', 'task_type'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      inference_id: z.string().describe('Path parameter: inference_id (required)'),
      task_type: z.string().describe('Path parameter: task_type (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.inference API'),
  },
  {
    type: 'elasticsearch.inference.put',
    connectorIdRequired: false,
    description:
      'PUT _inference/{inference_id} | _inference/{task_type}/{inference_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{inference_id}', '_inference/{task_type}/{inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put',
    parameterTypes: {
      pathParams: ['inference_id', 'task_type'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      inference_id: z.string().describe('Path parameter: inference_id (required)'),
      task_type: z.string().describe('Path parameter: task_type (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put API'),
  },
  {
    type: 'elasticsearch.inference.put_alibabacloud',
    connectorIdRequired: false,
    description: 'PUT _inference/{task_type}/{alibabacloud_inference_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{task_type}/{alibabacloud_inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-alibabacloud',
    parameterTypes: {
      pathParams: ['task_type', 'alibabacloud_inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_type: z.string().describe('Path parameter: task_type (required)'),
      alibabacloud_inference_id: z
        .string()
        .describe('Path parameter: alibabacloud_inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put_alibabacloud API'),
  },
  {
    type: 'elasticsearch.inference.put_amazonbedrock',
    connectorIdRequired: false,
    description: 'PUT _inference/{task_type}/{amazonbedrock_inference_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{task_type}/{amazonbedrock_inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-amazonbedrock',
    parameterTypes: {
      pathParams: ['task_type', 'amazonbedrock_inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_type: z.string().describe('Path parameter: task_type (required)'),
      amazonbedrock_inference_id: z
        .string()
        .describe('Path parameter: amazonbedrock_inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put_amazonbedrock API'),
  },
  {
    type: 'elasticsearch.inference.put_amazonsagemaker',
    connectorIdRequired: false,
    description: 'PUT _inference/{task_type}/{amazonsagemaker_inference_id} - 0 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{task_type}/{amazonsagemaker_inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/infer-service-amazon-sagemaker.html',
    parameterTypes: {
      pathParams: ['task_type', 'amazonsagemaker_inference_id'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_type: z.string().describe('Path parameter: task_type (required)'),
      amazonsagemaker_inference_id: z
        .string()
        .describe('Path parameter: amazonsagemaker_inference_id (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put_amazonsagemaker API'),
  },
  {
    type: 'elasticsearch.inference.put_anthropic',
    connectorIdRequired: false,
    description: 'PUT _inference/{task_type}/{anthropic_inference_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{task_type}/{anthropic_inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-anthropic',
    parameterTypes: {
      pathParams: ['task_type', 'anthropic_inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_type: z.string().describe('Path parameter: task_type (required)'),
      anthropic_inference_id: z
        .string()
        .describe('Path parameter: anthropic_inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put_anthropic API'),
  },
  {
    type: 'elasticsearch.inference.put_azureaistudio',
    connectorIdRequired: false,
    description: 'PUT _inference/{task_type}/{azureaistudio_inference_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{task_type}/{azureaistudio_inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-azureaistudio',
    parameterTypes: {
      pathParams: ['task_type', 'azureaistudio_inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_type: z.string().describe('Path parameter: task_type (required)'),
      azureaistudio_inference_id: z
        .string()
        .describe('Path parameter: azureaistudio_inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put_azureaistudio API'),
  },
  {
    type: 'elasticsearch.inference.put_azureopenai',
    connectorIdRequired: false,
    description: 'PUT _inference/{task_type}/{azureopenai_inference_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{task_type}/{azureopenai_inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-azureopenai',
    parameterTypes: {
      pathParams: ['task_type', 'azureopenai_inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_type: z.string().describe('Path parameter: task_type (required)'),
      azureopenai_inference_id: z
        .string()
        .describe('Path parameter: azureopenai_inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put_azureopenai API'),
  },
  {
    type: 'elasticsearch.inference.put_cohere',
    connectorIdRequired: false,
    description: 'PUT _inference/{task_type}/{cohere_inference_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{task_type}/{cohere_inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-cohere',
    parameterTypes: {
      pathParams: ['task_type', 'cohere_inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_type: z.string().describe('Path parameter: task_type (required)'),
      cohere_inference_id: z.string().describe('Path parameter: cohere_inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put_cohere API'),
  },
  {
    type: 'elasticsearch.inference.put_deepseek',
    connectorIdRequired: false,
    description: 'PUT _inference/{task_type}/{deepseek_inference_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{task_type}/{deepseek_inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-deepseek',
    parameterTypes: {
      pathParams: ['task_type', 'deepseek_inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_type: z.string().describe('Path parameter: task_type (required)'),
      deepseek_inference_id: z
        .string()
        .describe('Path parameter: deepseek_inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put_deepseek API'),
  },
  {
    type: 'elasticsearch.inference.put_elasticsearch',
    connectorIdRequired: false,
    description: 'PUT _inference/{task_type}/{elasticsearch_inference_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{task_type}/{elasticsearch_inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-elasticsearch',
    parameterTypes: {
      pathParams: ['task_type', 'elasticsearch_inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_type: z.string().describe('Path parameter: task_type (required)'),
      elasticsearch_inference_id: z
        .string()
        .describe('Path parameter: elasticsearch_inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put_elasticsearch API'),
  },
  {
    type: 'elasticsearch.inference.put_elser',
    connectorIdRequired: false,
    description: 'PUT _inference/{task_type}/{elser_inference_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{task_type}/{elser_inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-elser',
    parameterTypes: {
      pathParams: ['task_type', 'elser_inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_type: z.string().describe('Path parameter: task_type (required)'),
      elser_inference_id: z.string().describe('Path parameter: elser_inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put_elser API'),
  },
  {
    type: 'elasticsearch.inference.put_googleaistudio',
    connectorIdRequired: false,
    description: 'PUT _inference/{task_type}/{googleaistudio_inference_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{task_type}/{googleaistudio_inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-googleaistudio',
    parameterTypes: {
      pathParams: ['task_type', 'googleaistudio_inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_type: z.string().describe('Path parameter: task_type (required)'),
      googleaistudio_inference_id: z
        .string()
        .describe('Path parameter: googleaistudio_inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put_googleaistudio API'),
  },
  {
    type: 'elasticsearch.inference.put_googlevertexai',
    connectorIdRequired: false,
    description: 'PUT _inference/{task_type}/{googlevertexai_inference_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{task_type}/{googlevertexai_inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-googlevertexai',
    parameterTypes: {
      pathParams: ['task_type', 'googlevertexai_inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_type: z.string().describe('Path parameter: task_type (required)'),
      googlevertexai_inference_id: z
        .string()
        .describe('Path parameter: googlevertexai_inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put_googlevertexai API'),
  },
  {
    type: 'elasticsearch.inference.put_hugging_face',
    connectorIdRequired: false,
    description: 'PUT _inference/{task_type}/{huggingface_inference_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{task_type}/{huggingface_inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-hugging-face',
    parameterTypes: {
      pathParams: ['task_type', 'huggingface_inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_type: z.string().describe('Path parameter: task_type (required)'),
      huggingface_inference_id: z
        .string()
        .describe('Path parameter: huggingface_inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put_hugging_face API'),
  },
  {
    type: 'elasticsearch.inference.put_jinaai',
    connectorIdRequired: false,
    description: 'PUT _inference/{task_type}/{jinaai_inference_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{task_type}/{jinaai_inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-jinaai',
    parameterTypes: {
      pathParams: ['task_type', 'jinaai_inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_type: z.string().describe('Path parameter: task_type (required)'),
      jinaai_inference_id: z.string().describe('Path parameter: jinaai_inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put_jinaai API'),
  },
  {
    type: 'elasticsearch.inference.put_mistral',
    connectorIdRequired: false,
    description: 'PUT _inference/{task_type}/{mistral_inference_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{task_type}/{mistral_inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-mistral',
    parameterTypes: {
      pathParams: ['task_type', 'mistral_inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_type: z.string().describe('Path parameter: task_type (required)'),
      mistral_inference_id: z.string().describe('Path parameter: mistral_inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put_mistral API'),
  },
  {
    type: 'elasticsearch.inference.put_openai',
    connectorIdRequired: false,
    description: 'PUT _inference/{task_type}/{openai_inference_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{task_type}/{openai_inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-openai',
    parameterTypes: {
      pathParams: ['task_type', 'openai_inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_type: z.string().describe('Path parameter: task_type (required)'),
      openai_inference_id: z.string().describe('Path parameter: openai_inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put_openai API'),
  },
  {
    type: 'elasticsearch.inference.put_voyageai',
    connectorIdRequired: false,
    description: 'PUT _inference/{task_type}/{voyageai_inference_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{task_type}/{voyageai_inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-voyageai',
    parameterTypes: {
      pathParams: ['task_type', 'voyageai_inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_type: z.string().describe('Path parameter: task_type (required)'),
      voyageai_inference_id: z
        .string()
        .describe('Path parameter: voyageai_inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put_voyageai API'),
  },
  {
    type: 'elasticsearch.inference.put_watsonx',
    connectorIdRequired: false,
    description: 'PUT _inference/{task_type}/{watsonx_inference_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_inference/{task_type}/{watsonx_inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-watsonx',
    parameterTypes: {
      pathParams: ['task_type', 'watsonx_inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_type: z.string().describe('Path parameter: task_type (required)'),
      watsonx_inference_id: z.string().describe('Path parameter: watsonx_inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.put_watsonx API'),
  },
  {
    type: 'elasticsearch.inference.rerank',
    connectorIdRequired: false,
    description: 'POST _inference/rerank/{inference_id} - 5 parameters',
    methods: ['POST'],
    patterns: ['_inference/rerank/{inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-inference',
    parameterTypes: {
      pathParams: ['inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      inference_id: z.string().describe('Path parameter: inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.rerank API'),
  },
  {
    type: 'elasticsearch.inference.sparse_embedding',
    connectorIdRequired: false,
    description: 'POST _inference/sparse_embedding/{inference_id} - 5 parameters',
    methods: ['POST'],
    patterns: ['_inference/sparse_embedding/{inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-inference',
    parameterTypes: {
      pathParams: ['inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      inference_id: z.string().describe('Path parameter: inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.sparse_embedding API'),
  },
  {
    type: 'elasticsearch.inference.stream_completion',
    connectorIdRequired: false,
    description: 'POST _inference/completion/{inference_id}/_stream - 4 parameters',
    methods: ['POST'],
    patterns: ['_inference/completion/{inference_id}/_stream'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-stream-inference',
    parameterTypes: {
      pathParams: ['inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      inference_id: z.string().describe('Path parameter: inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.stream_completion API'),
  },
  {
    type: 'elasticsearch.inference.text_embedding',
    connectorIdRequired: false,
    description: 'POST _inference/text_embedding/{inference_id} - 5 parameters',
    methods: ['POST'],
    patterns: ['_inference/text_embedding/{inference_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-inference',
    parameterTypes: {
      pathParams: ['inference_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      inference_id: z.string().describe('Path parameter: inference_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.text_embedding API'),
  },
  {
    type: 'elasticsearch.inference.update',
    connectorIdRequired: false,
    description:
      'PUT _inference/{inference_id}/_update | _inference/{task_type}/{inference_id}/_update - 4 parameters',
    methods: ['PUT'],
    patterns: [
      '_inference/{inference_id}/_update',
      '_inference/{task_type}/{inference_id}/_update',
    ],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-update',
    parameterTypes: {
      pathParams: ['inference_id', 'task_type'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      inference_id: z.string().describe('Path parameter: inference_id (required)'),
      task_type: z.string().describe('Path parameter: task_type (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from inference.update API'),
  },
  {
    type: 'elasticsearch.info',
    connectorIdRequired: false,
    description: 'GET elasticsearch.info - 4 parameters',
    methods: ['GET'],
    patterns: [''],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-info',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from info API'),
  },
  {
    type: 'elasticsearch.ingest.delete_geoip_database',
    connectorIdRequired: false,
    description: 'DELETE _ingest/geoip/database/{id} - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_ingest/geoip/database/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-delete-geoip-database',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ingest.delete_geoip_database API'),
  },
  {
    type: 'elasticsearch.ingest.delete_ip_location_database',
    connectorIdRequired: false,
    description: 'DELETE _ingest/ip_location/database/{id} - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_ingest/ip_location/database/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-delete-ip-location-database',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ingest.delete_ip_location_database API'),
  },
  {
    type: 'elasticsearch.ingest.delete_pipeline',
    connectorIdRequired: false,
    description: 'DELETE _ingest/pipeline/{id} - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_ingest/pipeline/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-delete-pipeline',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ingest.delete_pipeline API'),
  },
  {
    type: 'elasticsearch.ingest.geo_ip_stats',
    connectorIdRequired: false,
    description: 'GET _ingest/geoip/stats - 4 parameters',
    methods: ['GET'],
    patterns: ['_ingest/geoip/stats'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/reference/enrich-processor/geoip-processor',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ingest.geo_ip_stats API'),
  },
  {
    type: 'elasticsearch.ingest.get_geoip_database',
    connectorIdRequired: false,
    description: 'GET _ingest/geoip/database | _ingest/geoip/database/{id} - 4 parameters',
    methods: ['GET'],
    patterns: ['_ingest/geoip/database', '_ingest/geoip/database/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-get-geoip-database',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ingest.get_geoip_database API'),
  },
  {
    type: 'elasticsearch.ingest.get_ip_location_database',
    connectorIdRequired: false,
    description:
      'GET _ingest/ip_location/database | _ingest/ip_location/database/{id} - 5 parameters',
    methods: ['GET'],
    patterns: ['_ingest/ip_location/database', '_ingest/ip_location/database/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-get-ip-location-database',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ingest.get_ip_location_database API'),
  },
  {
    type: 'elasticsearch.ingest.get_pipeline',
    connectorIdRequired: false,
    description: 'GET _ingest/pipeline | _ingest/pipeline/{id} - 6 parameters',
    methods: ['GET'],
    patterns: ['_ingest/pipeline', '_ingest/pipeline/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-get-pipeline',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'summary'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      summary: z.boolean().optional().describe('Boolean flag: summary'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ingest.get_pipeline API'),
  },
  {
    type: 'elasticsearch.ingest.processor_grok',
    connectorIdRequired: false,
    description: 'GET _ingest/processor/grok - 4 parameters',
    methods: ['GET'],
    patterns: ['_ingest/processor/grok'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/reference/enrich-processor/grok-processor',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ingest.processor_grok API'),
  },
  {
    type: 'elasticsearch.ingest.put_geoip_database',
    connectorIdRequired: false,
    description: 'PUT _ingest/geoip/database/{id} - 6 parameters',
    methods: ['PUT'],
    patterns: ['_ingest/geoip/database/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-put-geoip-database',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ingest.put_geoip_database API'),
  },
  {
    type: 'elasticsearch.ingest.put_ip_location_database',
    connectorIdRequired: false,
    description: 'PUT _ingest/ip_location/database/{id} - 6 parameters',
    methods: ['PUT'],
    patterns: ['_ingest/ip_location/database/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-put-ip-location-database',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ingest.put_ip_location_database API'),
  },
  {
    type: 'elasticsearch.ingest.put_pipeline',
    connectorIdRequired: false,
    description: 'PUT _ingest/pipeline/{id} - 7 parameters',
    methods: ['PUT'],
    patterns: ['_ingest/pipeline/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/manage-data/ingest/transform-enrich/ingest-pipelines',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'master_timeout',
        'timeout',
        'if_version',
      ],
      bodyParams: ['description', 'processors', 'on_failure', 'version'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      if_version: z.union([z.string(), z.number()]).optional().describe('Parameter: if_version'),
      description: z.string().optional().describe('Description'),
      processors: z.array(z.object({}).passthrough()).optional().describe('Pipeline processors'),
      on_failure: z.array(z.object({}).passthrough()).optional().describe('Failure processors'),
      version: z.number().optional().describe('Template version'),
    }),
    outputSchema: z.any().describe('Response from ingest.put_pipeline API'),
  },
  {
    type: 'elasticsearch.ingest.simulate',
    connectorIdRequired: false,
    description:
      'GET/POST _ingest/pipeline/_simulate | _ingest/pipeline/{id}/_simulate - 5 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_ingest/pipeline/_simulate', '_ingest/pipeline/{id}/_simulate'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-simulate',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'verbose'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      verbose: z.boolean().optional().describe('Boolean flag: verbose'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ingest.simulate API'),
  },
  {
    type: 'elasticsearch.knn_search',
    connectorIdRequired: false,
    description: 'GET/POST {index}/_knn_search - 0 parameters',
    methods: ['GET', 'POST'],
    patterns: ['{index}/_knn_search'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/search-search.html',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from knn_search API'),
  },
  {
    type: 'elasticsearch.license.delete',
    connectorIdRequired: false,
    description: 'DELETE _license - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_license'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-delete',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from license.delete API'),
  },
  {
    type: 'elasticsearch.license.get',
    connectorIdRequired: false,
    description: 'GET _license - 6 parameters',
    methods: ['GET'],
    patterns: ['_license'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-get',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'accept_enterprise', 'local'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      accept_enterprise: z.boolean().optional().describe('Boolean flag: accept_enterprise'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from license.get API'),
  },
  {
    type: 'elasticsearch.license.get_basic_status',
    connectorIdRequired: false,
    description: 'GET _license/basic_status - 4 parameters',
    methods: ['GET'],
    patterns: ['_license/basic_status'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-get-basic-status',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from license.get_basic_status API'),
  },
  {
    type: 'elasticsearch.license.get_trial_status',
    connectorIdRequired: false,
    description: 'GET _license/trial_status - 4 parameters',
    methods: ['GET'],
    patterns: ['_license/trial_status'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-get-trial-status',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from license.get_trial_status API'),
  },
  {
    type: 'elasticsearch.license.post',
    connectorIdRequired: false,
    description: 'PUT/POST _license - 7 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_license'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-post',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'acknowledge',
        'master_timeout',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      acknowledge: z.boolean().optional().describe('Boolean flag: acknowledge'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from license.post API'),
  },
  {
    type: 'elasticsearch.license.post_start_basic',
    connectorIdRequired: false,
    description: 'POST _license/start_basic - 7 parameters',
    methods: ['POST'],
    patterns: ['_license/start_basic'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-post-start-basic',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'acknowledge',
        'master_timeout',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      acknowledge: z.boolean().optional().describe('Boolean flag: acknowledge'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from license.post_start_basic API'),
  },
  {
    type: 'elasticsearch.license.post_start_trial',
    connectorIdRequired: false,
    description: 'POST _license/start_trial - 7 parameters',
    methods: ['POST'],
    patterns: ['_license/start_trial'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-post-start-trial',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'acknowledge',
        'type_query_string',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      acknowledge: z.boolean().optional().describe('Boolean flag: acknowledge'),
      type_query_string: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: type_query_string'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from license.post_start_trial API'),
  },
  {
    type: 'elasticsearch.logstash.delete_pipeline',
    connectorIdRequired: false,
    description: 'DELETE _logstash/pipeline/{id} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_logstash/pipeline/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-logstash-delete-pipeline',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from logstash.delete_pipeline API'),
  },
  {
    type: 'elasticsearch.logstash.get_pipeline',
    connectorIdRequired: false,
    description: 'GET _logstash/pipeline | _logstash/pipeline/{id} - 4 parameters',
    methods: ['GET'],
    patterns: ['_logstash/pipeline', '_logstash/pipeline/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-logstash-get-pipeline',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from logstash.get_pipeline API'),
  },
  {
    type: 'elasticsearch.logstash.put_pipeline',
    connectorIdRequired: false,
    description: 'PUT _logstash/pipeline/{id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_logstash/pipeline/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-logstash-put-pipeline',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from logstash.put_pipeline API'),
  },
  {
    type: 'elasticsearch.mget',
    connectorIdRequired: false,
    description: 'GET/POST _mget | {index}/_mget - 13 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_mget', '{index}/_mget'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-mget',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'force_synthetic_source',
        'preference',
        'realtime',
        'refresh',
        'routing',
        '_source',
        '_source_excludes',
        '_source_includes',
        'stored_fields',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      force_synthetic_source: z
        .boolean()
        .optional()
        .describe('Boolean flag: force_synthetic_source'),
      preference: z.union([z.string(), z.number()]).optional().describe('Parameter: preference'),
      realtime: z.boolean().optional().describe('Boolean flag: realtime'),
      refresh: z.boolean().optional().describe('Boolean flag: refresh'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      _source: z.boolean().optional().describe('Boolean flag: _source'),
      _source_excludes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_excludes'),
      _source_includes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_includes'),
      stored_fields: z.enum(['false']).optional().describe('Enum parameter: stored_fields'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from mget API'),
  },
  {
    type: 'elasticsearch.migration.deprecations',
    connectorIdRequired: false,
    description: 'GET _migration/deprecations | {index}/_migration/deprecations - 4 parameters',
    methods: ['GET'],
    patterns: ['_migration/deprecations', '{index}/_migration/deprecations'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-migration-deprecations',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from migration.deprecations API'),
  },
  {
    type: 'elasticsearch.migration.get_feature_upgrade_status',
    connectorIdRequired: false,
    description: 'GET _migration/system_features - 4 parameters',
    methods: ['GET'],
    patterns: ['_migration/system_features'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-migration-get-feature-upgrade-status',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from migration.get_feature_upgrade_status API'),
  },
  {
    type: 'elasticsearch.migration.post_feature_upgrade',
    connectorIdRequired: false,
    description: 'POST _migration/system_features - 4 parameters',
    methods: ['POST'],
    patterns: ['_migration/system_features'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-migration-get-feature-upgrade-status',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from migration.post_feature_upgrade API'),
  },
  {
    type: 'elasticsearch.ml.clear_trained_model_deployment_cache',
    connectorIdRequired: false,
    description: 'POST _ml/trained_models/{model_id}/deployment/cache/_clear - 4 parameters',
    methods: ['POST'],
    patterns: ['_ml/trained_models/{model_id}/deployment/cache/_clear'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-clear-trained-model-deployment-cache',
    parameterTypes: {
      pathParams: ['model_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      model_id: z.string().describe('Path parameter: model_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.clear_trained_model_deployment_cache API'),
  },
  {
    type: 'elasticsearch.ml.close_job',
    connectorIdRequired: false,
    description: 'POST _ml/anomaly_detectors/{job_id}/_close - 7 parameters',
    methods: ['POST'],
    patterns: ['_ml/anomaly_detectors/{job_id}/_close'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-close-job',
    parameterTypes: {
      pathParams: ['job_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_match',
        'force',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      force: z.boolean().optional().describe('Boolean flag: force'),
      timeout: z.enum(['30m', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.close_job API'),
  },
  {
    type: 'elasticsearch.ml.delete_calendar',
    connectorIdRequired: false,
    description: 'DELETE _ml/calendars/{calendar_id} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_ml/calendars/{calendar_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-calendar',
    parameterTypes: {
      pathParams: ['calendar_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      calendar_id: z.string().describe('Path parameter: calendar_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.delete_calendar API'),
  },
  {
    type: 'elasticsearch.ml.delete_calendar_event',
    connectorIdRequired: false,
    description: 'DELETE _ml/calendars/{calendar_id}/events/{event_id} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_ml/calendars/{calendar_id}/events/{event_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-calendar-event',
    parameterTypes: {
      pathParams: ['calendar_id', 'event_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      calendar_id: z.string().describe('Path parameter: calendar_id (required)'),
      event_id: z.string().describe('Path parameter: event_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.delete_calendar_event API'),
  },
  {
    type: 'elasticsearch.ml.delete_calendar_job',
    connectorIdRequired: false,
    description: 'DELETE _ml/calendars/{calendar_id}/jobs/{job_id} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_ml/calendars/{calendar_id}/jobs/{job_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-calendar-job',
    parameterTypes: {
      pathParams: ['calendar_id', 'job_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      calendar_id: z.string().describe('Path parameter: calendar_id (required)'),
      job_id: z.string().describe('Path parameter: job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.delete_calendar_job API'),
  },
  {
    type: 'elasticsearch.ml.delete_data_frame_analytics',
    connectorIdRequired: false,
    description: 'DELETE _ml/data_frame/analytics/{id} - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_ml/data_frame/analytics/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-data-frame-analytics',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'force', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      force: z.boolean().optional().describe('Boolean flag: force'),
      timeout: z.enum(['1m', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.delete_data_frame_analytics API'),
  },
  {
    type: 'elasticsearch.ml.delete_datafeed',
    connectorIdRequired: false,
    description: 'DELETE _ml/datafeeds/{datafeed_id} - 5 parameters',
    methods: ['DELETE'],
    patterns: ['_ml/datafeeds/{datafeed_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-datafeed',
    parameterTypes: {
      pathParams: ['datafeed_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'force'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      datafeed_id: z.string().describe('Path parameter: datafeed_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      force: z.boolean().optional().describe('Boolean flag: force'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.delete_datafeed API'),
  },
  {
    type: 'elasticsearch.ml.delete_expired_data',
    connectorIdRequired: false,
    description:
      'DELETE _ml/_delete_expired_data/{job_id} | _ml/_delete_expired_data - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_ml/_delete_expired_data/{job_id}', '_ml/_delete_expired_data'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-expired-data',
    parameterTypes: {
      pathParams: ['job_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'requests_per_second',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      requests_per_second: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: requests_per_second'),
      timeout: z.enum(['8h', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.delete_expired_data API'),
  },
  {
    type: 'elasticsearch.ml.delete_filter',
    connectorIdRequired: false,
    description: 'DELETE _ml/filters/{filter_id} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_ml/filters/{filter_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-filter',
    parameterTypes: {
      pathParams: ['filter_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      filter_id: z.string().describe('Path parameter: filter_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.delete_filter API'),
  },
  {
    type: 'elasticsearch.ml.delete_forecast',
    connectorIdRequired: false,
    description:
      'DELETE _ml/anomaly_detectors/{job_id}/_forecast | _ml/anomaly_detectors/{job_id}/_forecast/{forecast_id} - 6 parameters',
    methods: ['DELETE'],
    patterns: [
      '_ml/anomaly_detectors/{job_id}/_forecast',
      '_ml/anomaly_detectors/{job_id}/_forecast/{forecast_id}',
    ],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-forecast',
    parameterTypes: {
      pathParams: ['job_id', 'forecast_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'allow_no_forecasts', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      forecast_id: z.string().describe('Path parameter: forecast_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_forecasts: z.boolean().optional().describe('Boolean flag: allow_no_forecasts'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.delete_forecast API'),
  },
  {
    type: 'elasticsearch.ml.delete_job',
    connectorIdRequired: false,
    description: 'DELETE _ml/anomaly_detectors/{job_id} - 7 parameters',
    methods: ['DELETE'],
    patterns: ['_ml/anomaly_detectors/{job_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-job',
    parameterTypes: {
      pathParams: ['job_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'force',
        'delete_user_annotations',
        'wait_for_completion',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      force: z.boolean().optional().describe('Boolean flag: force'),
      delete_user_annotations: z
        .boolean()
        .optional()
        .describe('Boolean flag: delete_user_annotations'),
      wait_for_completion: z.boolean().optional().describe('Boolean flag: wait_for_completion'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.delete_job API'),
  },
  {
    type: 'elasticsearch.ml.delete_model_snapshot',
    connectorIdRequired: false,
    description:
      'DELETE _ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-model-snapshot',
    parameterTypes: {
      pathParams: ['job_id', 'snapshot_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      snapshot_id: z.string().describe('Path parameter: snapshot_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.delete_model_snapshot API'),
  },
  {
    type: 'elasticsearch.ml.delete_trained_model',
    connectorIdRequired: false,
    description: 'DELETE _ml/trained_models/{model_id} - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_ml/trained_models/{model_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-trained-model',
    parameterTypes: {
      pathParams: ['model_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'force', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      model_id: z.string().describe('Path parameter: model_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      force: z.boolean().optional().describe('Boolean flag: force'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.delete_trained_model API'),
  },
  {
    type: 'elasticsearch.ml.delete_trained_model_alias',
    connectorIdRequired: false,
    description: 'DELETE _ml/trained_models/{model_id}/model_aliases/{model_alias} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_ml/trained_models/{model_id}/model_aliases/{model_alias}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-trained-model-alias',
    parameterTypes: {
      pathParams: ['model_id', 'model_alias'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      model_id: z.string().describe('Path parameter: model_id (required)'),
      model_alias: z.string().describe('Path parameter: model_alias (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.delete_trained_model_alias API'),
  },
  {
    type: 'elasticsearch.ml.estimate_model_memory',
    connectorIdRequired: false,
    description: 'POST _ml/anomaly_detectors/_estimate_model_memory - 4 parameters',
    methods: ['POST'],
    patterns: ['_ml/anomaly_detectors/_estimate_model_memory'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-estimate-model-memory',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.estimate_model_memory API'),
  },
  {
    type: 'elasticsearch.ml.evaluate_data_frame',
    connectorIdRequired: false,
    description: 'POST _ml/data_frame/_evaluate - 4 parameters',
    methods: ['POST'],
    patterns: ['_ml/data_frame/_evaluate'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-evaluate-data-frame',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.evaluate_data_frame API'),
  },
  {
    type: 'elasticsearch.ml.explain_data_frame_analytics',
    connectorIdRequired: false,
    description:
      'GET/POST _ml/data_frame/analytics/_explain | _ml/data_frame/analytics/{id}/_explain - 4 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_ml/data_frame/analytics/_explain', '_ml/data_frame/analytics/{id}/_explain'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-explain-data-frame-analytics',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.explain_data_frame_analytics API'),
  },
  {
    type: 'elasticsearch.ml.flush_job',
    connectorIdRequired: false,
    description: 'POST _ml/anomaly_detectors/{job_id}/_flush - 9 parameters',
    methods: ['POST'],
    patterns: ['_ml/anomaly_detectors/{job_id}/_flush'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-flush-job',
    parameterTypes: {
      pathParams: ['job_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'advance_time',
        'calc_interim',
        'end',
        'skip_time',
        'start',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      advance_time: z.array(z.string()).optional().describe('Array parameter: advance_time'),
      calc_interim: z.boolean().optional().describe('Boolean flag: calc_interim'),
      end: z.array(z.string()).optional().describe('Array parameter: end'),
      skip_time: z.array(z.string()).optional().describe('Array parameter: skip_time'),
      start: z.array(z.string()).optional().describe('Array parameter: start'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.flush_job API'),
  },
  {
    type: 'elasticsearch.ml.forecast',
    connectorIdRequired: false,
    description: 'POST _ml/anomaly_detectors/{job_id}/_forecast - 7 parameters',
    methods: ['POST'],
    patterns: ['_ml/anomaly_detectors/{job_id}/_forecast'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-forecast',
    parameterTypes: {
      pathParams: ['job_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'duration',
        'expires_in',
        'max_model_memory',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      duration: z.enum(['1d', '-1', '0']).optional().describe('Enum parameter: duration'),
      expires_in: z.enum(['14d', '-1', '0']).optional().describe('Enum parameter: expires_in'),
      max_model_memory: z.enum(['20mb']).optional().describe('Enum parameter: max_model_memory'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.forecast API'),
  },
  {
    type: 'elasticsearch.ml.get_buckets',
    connectorIdRequired: false,
    description:
      'GET/POST _ml/anomaly_detectors/{job_id}/results/buckets/{timestamp} | _ml/anomaly_detectors/{job_id}/results/buckets - 13 parameters',
    methods: ['GET', 'POST'],
    patterns: [
      '_ml/anomaly_detectors/{job_id}/results/buckets/{timestamp}',
      '_ml/anomaly_detectors/{job_id}/results/buckets',
    ],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-buckets',
    parameterTypes: {
      pathParams: ['job_id', 'timestamp'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'anomaly_score',
        'desc',
        'end',
        'exclude_interim',
        'expand',
        'from',
        'size',
        'sort',
        'start',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      timestamp: z.string().describe('Path parameter: timestamp (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      anomaly_score: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: anomaly_score'),
      desc: z.boolean().optional().describe('Boolean flag: desc'),
      end: z
        .union([z.number(), z.array(z.number()), z.enum(['-1'])])
        .optional()
        .describe('Numeric parameter: end'),
      exclude_interim: z.boolean().optional().describe('Boolean flag: exclude_interim'),
      expand: z.boolean().optional().describe('Boolean flag: expand'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['100'])])
        .optional()
        .describe('Numeric parameter: size'),
      sort: z.enum(['timestamp']).optional().describe('Enum parameter: sort'),
      start: z
        .union([z.number(), z.array(z.number()), z.enum(['-1'])])
        .optional()
        .describe('Numeric parameter: start'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_buckets API'),
  },
  {
    type: 'elasticsearch.ml.get_calendar_events',
    connectorIdRequired: false,
    description: 'GET _ml/calendars/{calendar_id}/events - 9 parameters',
    methods: ['GET'],
    patterns: ['_ml/calendars/{calendar_id}/events'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-calendar-events',
    parameterTypes: {
      pathParams: ['calendar_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'end',
        'from',
        'job_id',
        'size',
        'start',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      calendar_id: z.string().describe('Path parameter: calendar_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      end: z.array(z.string()).optional().describe('Array parameter: end'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      job_id: z.union([z.string(), z.number()]).optional().describe('Parameter: job_id'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['100'])])
        .optional()
        .describe('Numeric parameter: size'),
      start: z.array(z.string()).optional().describe('Array parameter: start'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_calendar_events API'),
  },
  {
    type: 'elasticsearch.ml.get_calendars',
    connectorIdRequired: false,
    description: 'GET/POST _ml/calendars | _ml/calendars/{calendar_id} - 6 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_ml/calendars', '_ml/calendars/{calendar_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-calendars',
    parameterTypes: {
      pathParams: ['calendar_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'from', 'size'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      calendar_id: z.string().describe('Path parameter: calendar_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['10000'])])
        .optional()
        .describe('Numeric parameter: size'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_calendars API'),
  },
  {
    type: 'elasticsearch.ml.get_categories',
    connectorIdRequired: false,
    description:
      'GET/POST _ml/anomaly_detectors/{job_id}/results/categories/{category_id} | _ml/anomaly_detectors/{job_id}/results/categories - 7 parameters',
    methods: ['GET', 'POST'],
    patterns: [
      '_ml/anomaly_detectors/{job_id}/results/categories/{category_id}',
      '_ml/anomaly_detectors/{job_id}/results/categories',
    ],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-categories',
    parameterTypes: {
      pathParams: ['job_id', 'category_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'from',
        'partition_field_value',
        'size',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      category_id: z.string().describe('Path parameter: category_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      partition_field_value: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: partition_field_value'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['100'])])
        .optional()
        .describe('Numeric parameter: size'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_categories API'),
  },
  {
    type: 'elasticsearch.ml.get_data_frame_analytics',
    connectorIdRequired: false,
    description: 'GET _ml/data_frame/analytics/{id} | _ml/data_frame/analytics - 8 parameters',
    methods: ['GET'],
    patterns: ['_ml/data_frame/analytics/{id}', '_ml/data_frame/analytics'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-data-frame-analytics',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_match',
        'from',
        'size',
        'exclude_generated',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['100'])])
        .optional()
        .describe('Numeric parameter: size'),
      exclude_generated: z.boolean().optional().describe('Boolean flag: exclude_generated'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_data_frame_analytics API'),
  },
  {
    type: 'elasticsearch.ml.get_data_frame_analytics_stats',
    connectorIdRequired: false,
    description:
      'GET _ml/data_frame/analytics/_stats | _ml/data_frame/analytics/{id}/_stats - 8 parameters',
    methods: ['GET'],
    patterns: ['_ml/data_frame/analytics/_stats', '_ml/data_frame/analytics/{id}/_stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-data-frame-analytics-stats',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_match',
        'from',
        'size',
        'verbose',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['100'])])
        .optional()
        .describe('Numeric parameter: size'),
      verbose: z.boolean().optional().describe('Boolean flag: verbose'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_data_frame_analytics_stats API'),
  },
  {
    type: 'elasticsearch.ml.get_datafeed_stats',
    connectorIdRequired: false,
    description: 'GET _ml/datafeeds/{datafeed_id}/_stats | _ml/datafeeds/_stats - 5 parameters',
    methods: ['GET'],
    patterns: ['_ml/datafeeds/{datafeed_id}/_stats', '_ml/datafeeds/_stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-datafeed-stats',
    parameterTypes: {
      pathParams: ['datafeed_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'allow_no_match'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      datafeed_id: z.string().describe('Path parameter: datafeed_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_datafeed_stats API'),
  },
  {
    type: 'elasticsearch.ml.get_datafeeds',
    connectorIdRequired: false,
    description: 'GET _ml/datafeeds/{datafeed_id} | _ml/datafeeds - 6 parameters',
    methods: ['GET'],
    patterns: ['_ml/datafeeds/{datafeed_id}', '_ml/datafeeds'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-datafeeds',
    parameterTypes: {
      pathParams: ['datafeed_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_match',
        'exclude_generated',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      datafeed_id: z.string().describe('Path parameter: datafeed_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      exclude_generated: z.boolean().optional().describe('Boolean flag: exclude_generated'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_datafeeds API'),
  },
  {
    type: 'elasticsearch.ml.get_filters',
    connectorIdRequired: false,
    description: 'GET _ml/filters | _ml/filters/{filter_id} - 6 parameters',
    methods: ['GET'],
    patterns: ['_ml/filters', '_ml/filters/{filter_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-filters',
    parameterTypes: {
      pathParams: ['filter_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'from', 'size'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      filter_id: z.string().describe('Path parameter: filter_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['100'])])
        .optional()
        .describe('Numeric parameter: size'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_filters API'),
  },
  {
    type: 'elasticsearch.ml.get_influencers',
    connectorIdRequired: false,
    description: 'GET/POST _ml/anomaly_detectors/{job_id}/results/influencers - 12 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_ml/anomaly_detectors/{job_id}/results/influencers'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-influencers',
    parameterTypes: {
      pathParams: ['job_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'desc',
        'end',
        'exclude_interim',
        'influencer_score',
        'from',
        'size',
        'sort',
        'start',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      desc: z.boolean().optional().describe('Boolean flag: desc'),
      end: z
        .union([z.number(), z.array(z.number()), z.enum(['-1'])])
        .optional()
        .describe('Numeric parameter: end'),
      exclude_interim: z.boolean().optional().describe('Boolean flag: exclude_interim'),
      influencer_score: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: influencer_score'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['100'])])
        .optional()
        .describe('Numeric parameter: size'),
      sort: z.union([z.string(), z.number()]).optional().describe('Parameter: sort'),
      start: z
        .union([z.number(), z.array(z.number()), z.enum(['-1'])])
        .optional()
        .describe('Numeric parameter: start'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_influencers API'),
  },
  {
    type: 'elasticsearch.ml.get_job_stats',
    connectorIdRequired: false,
    description:
      'GET _ml/anomaly_detectors/_stats | _ml/anomaly_detectors/{job_id}/_stats - 5 parameters',
    methods: ['GET'],
    patterns: ['_ml/anomaly_detectors/_stats', '_ml/anomaly_detectors/{job_id}/_stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-job-stats',
    parameterTypes: {
      pathParams: ['job_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'allow_no_match'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_job_stats API'),
  },
  {
    type: 'elasticsearch.ml.get_jobs',
    connectorIdRequired: false,
    description: 'GET _ml/anomaly_detectors/{job_id} | _ml/anomaly_detectors - 6 parameters',
    methods: ['GET'],
    patterns: ['_ml/anomaly_detectors/{job_id}', '_ml/anomaly_detectors'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-jobs',
    parameterTypes: {
      pathParams: ['job_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_match',
        'exclude_generated',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      exclude_generated: z.boolean().optional().describe('Boolean flag: exclude_generated'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_jobs API'),
  },
  {
    type: 'elasticsearch.ml.get_memory_stats',
    connectorIdRequired: false,
    description: 'GET _ml/memory/_stats | _ml/memory/{node_id}/_stats - 6 parameters',
    methods: ['GET'],
    patterns: ['_ml/memory/_stats', '_ml/memory/{node_id}/_stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-memory-stats',
    parameterTypes: {
      pathParams: ['node_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      node_id: z.string().describe('Path parameter: node_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_memory_stats API'),
  },
  {
    type: 'elasticsearch.ml.get_model_snapshot_upgrade_stats',
    connectorIdRequired: false,
    description:
      'GET _ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_upgrade/_stats - 5 parameters',
    methods: ['GET'],
    patterns: ['_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_upgrade/_stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-model-snapshot-upgrade-stats',
    parameterTypes: {
      pathParams: ['job_id', 'snapshot_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'allow_no_match'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      snapshot_id: z.string().describe('Path parameter: snapshot_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_model_snapshot_upgrade_stats API'),
  },
  {
    type: 'elasticsearch.ml.get_model_snapshots',
    connectorIdRequired: false,
    description:
      'GET/POST _ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id} | _ml/anomaly_detectors/{job_id}/model_snapshots - 10 parameters',
    methods: ['GET', 'POST'],
    patterns: [
      '_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}',
      '_ml/anomaly_detectors/{job_id}/model_snapshots',
    ],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-model-snapshots',
    parameterTypes: {
      pathParams: ['job_id', 'snapshot_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'desc',
        'end',
        'from',
        'size',
        'sort',
        'start',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      snapshot_id: z.string().describe('Path parameter: snapshot_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      desc: z.boolean().optional().describe('Boolean flag: desc'),
      end: z.array(z.string()).optional().describe('Array parameter: end'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['100'])])
        .optional()
        .describe('Numeric parameter: size'),
      sort: z.union([z.string(), z.number()]).optional().describe('Parameter: sort'),
      start: z.array(z.string()).optional().describe('Array parameter: start'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_model_snapshots API'),
  },
  {
    type: 'elasticsearch.ml.get_overall_buckets',
    connectorIdRequired: false,
    description: 'GET/POST _ml/anomaly_detectors/{job_id}/results/overall_buckets - 11 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_ml/anomaly_detectors/{job_id}/results/overall_buckets'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-overall-buckets',
    parameterTypes: {
      pathParams: ['job_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_match',
        'bucket_span',
        'end',
        'exclude_interim',
        'overall_score',
        'start',
        'top_n',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      bucket_span: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: bucket_span'),
      end: z.array(z.string()).optional().describe('Array parameter: end'),
      exclude_interim: z.boolean().optional().describe('Boolean flag: exclude_interim'),
      overall_score: z.array(z.string()).optional().describe('Array parameter: overall_score'),
      start: z.array(z.string()).optional().describe('Array parameter: start'),
      top_n: z
        .union([z.number(), z.array(z.number()), z.enum(['1'])])
        .optional()
        .describe('Numeric parameter: top_n'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_overall_buckets API'),
  },
  {
    type: 'elasticsearch.ml.get_records',
    connectorIdRequired: false,
    description: 'GET/POST _ml/anomaly_detectors/{job_id}/results/records - 12 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_ml/anomaly_detectors/{job_id}/results/records'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-records',
    parameterTypes: {
      pathParams: ['job_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'desc',
        'end',
        'exclude_interim',
        'from',
        'record_score',
        'size',
        'sort',
        'start',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      desc: z.boolean().optional().describe('Boolean flag: desc'),
      end: z
        .union([z.number(), z.array(z.number()), z.enum(['-1'])])
        .optional()
        .describe('Numeric parameter: end'),
      exclude_interim: z.boolean().optional().describe('Boolean flag: exclude_interim'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      record_score: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: record_score'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['100'])])
        .optional()
        .describe('Numeric parameter: size'),
      sort: z.enum(['record_score']).optional().describe('Enum parameter: sort'),
      start: z
        .union([z.number(), z.array(z.number()), z.enum(['-1'])])
        .optional()
        .describe('Numeric parameter: start'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_records API'),
  },
  {
    type: 'elasticsearch.ml.get_trained_models',
    connectorIdRequired: false,
    description: 'GET _ml/trained_models/{model_id} | _ml/trained_models - 11 parameters',
    methods: ['GET'],
    patterns: ['_ml/trained_models/{model_id}', '_ml/trained_models'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-trained-models',
    parameterTypes: {
      pathParams: ['model_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_match',
        'decompress_definition',
        'exclude_generated',
        'from',
        'include',
        'size',
        'tags',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      model_id: z.string().describe('Path parameter: model_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      decompress_definition: z.boolean().optional().describe('Boolean flag: decompress_definition'),
      exclude_generated: z.boolean().optional().describe('Boolean flag: exclude_generated'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      include: z
        .enum([
          'definition',
          'feature_importance_baseline',
          'hyperparameters',
          'total_feature_importance',
          'definition_status',
        ])
        .optional()
        .describe('Enum parameter: include'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['100'])])
        .optional()
        .describe('Numeric parameter: size'),
      tags: z.array(z.string()).optional().describe('Array parameter: tags'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_trained_models API'),
  },
  {
    type: 'elasticsearch.ml.get_trained_models_stats',
    connectorIdRequired: false,
    description:
      'GET _ml/trained_models/{model_id}/_stats | _ml/trained_models/_stats - 7 parameters',
    methods: ['GET'],
    patterns: ['_ml/trained_models/{model_id}/_stats', '_ml/trained_models/_stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-trained-models-stats',
    parameterTypes: {
      pathParams: ['model_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_match',
        'from',
        'size',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      model_id: z.string().describe('Path parameter: model_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['100'])])
        .optional()
        .describe('Numeric parameter: size'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.get_trained_models_stats API'),
  },
  {
    type: 'elasticsearch.ml.infer_trained_model',
    connectorIdRequired: false,
    description: 'POST _ml/trained_models/{model_id}/_infer - 5 parameters',
    methods: ['POST'],
    patterns: ['_ml/trained_models/{model_id}/_infer'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-infer-trained-model',
    parameterTypes: {
      pathParams: ['model_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      model_id: z.string().describe('Path parameter: model_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z.enum(['10s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.infer_trained_model API'),
  },
  {
    type: 'elasticsearch.ml.info',
    connectorIdRequired: false,
    description: 'GET _ml/info - 4 parameters',
    methods: ['GET'],
    patterns: ['_ml/info'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-info',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.info API'),
  },
  {
    type: 'elasticsearch.ml.open_job',
    connectorIdRequired: false,
    description: 'POST _ml/anomaly_detectors/{job_id}/_open - 5 parameters',
    methods: ['POST'],
    patterns: ['_ml/anomaly_detectors/{job_id}/_open'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-open-job',
    parameterTypes: {
      pathParams: ['job_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z.enum(['30m', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.open_job API'),
  },
  {
    type: 'elasticsearch.ml.post_calendar_events',
    connectorIdRequired: false,
    description: 'POST _ml/calendars/{calendar_id}/events - 4 parameters',
    methods: ['POST'],
    patterns: ['_ml/calendars/{calendar_id}/events'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-post-calendar-events',
    parameterTypes: {
      pathParams: ['calendar_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      calendar_id: z.string().describe('Path parameter: calendar_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.post_calendar_events API'),
  },
  {
    type: 'elasticsearch.ml.post_data',
    connectorIdRequired: false,
    description: 'POST _ml/anomaly_detectors/{job_id}/_data - 6 parameters',
    methods: ['POST'],
    patterns: ['_ml/anomaly_detectors/{job_id}/_data'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-post-data',
    parameterTypes: {
      pathParams: ['job_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'reset_end', 'reset_start'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      reset_end: z.array(z.string()).optional().describe('Array parameter: reset_end'),
      reset_start: z.array(z.string()).optional().describe('Array parameter: reset_start'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.post_data API'),
  },
  {
    type: 'elasticsearch.ml.preview_data_frame_analytics',
    connectorIdRequired: false,
    description:
      'GET/POST _ml/data_frame/analytics/_preview | _ml/data_frame/analytics/{id}/_preview - 4 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_ml/data_frame/analytics/_preview', '_ml/data_frame/analytics/{id}/_preview'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-preview-data-frame-analytics',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.preview_data_frame_analytics API'),
  },
  {
    type: 'elasticsearch.ml.preview_datafeed',
    connectorIdRequired: false,
    description:
      'GET/POST _ml/datafeeds/{datafeed_id}/_preview | _ml/datafeeds/_preview - 6 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_ml/datafeeds/{datafeed_id}/_preview', '_ml/datafeeds/_preview'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-preview-datafeed',
    parameterTypes: {
      pathParams: ['datafeed_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'start', 'end'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      datafeed_id: z.string().describe('Path parameter: datafeed_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      start: z.array(z.string()).optional().describe('Array parameter: start'),
      end: z.array(z.string()).optional().describe('Array parameter: end'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.preview_datafeed API'),
  },
  {
    type: 'elasticsearch.ml.put_calendar',
    connectorIdRequired: false,
    description: 'PUT _ml/calendars/{calendar_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_ml/calendars/{calendar_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-calendar',
    parameterTypes: {
      pathParams: ['calendar_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      calendar_id: z.string().describe('Path parameter: calendar_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.put_calendar API'),
  },
  {
    type: 'elasticsearch.ml.put_calendar_job',
    connectorIdRequired: false,
    description: 'PUT _ml/calendars/{calendar_id}/jobs/{job_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_ml/calendars/{calendar_id}/jobs/{job_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-calendar-job',
    parameterTypes: {
      pathParams: ['calendar_id', 'job_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      calendar_id: z.string().describe('Path parameter: calendar_id (required)'),
      job_id: z.string().describe('Path parameter: job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.put_calendar_job API'),
  },
  {
    type: 'elasticsearch.ml.put_data_frame_analytics',
    connectorIdRequired: false,
    description: 'PUT _ml/data_frame/analytics/{id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_ml/data_frame/analytics/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-data-frame-analytics',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.put_data_frame_analytics API'),
  },
  {
    type: 'elasticsearch.ml.put_datafeed',
    connectorIdRequired: false,
    description: 'PUT _ml/datafeeds/{datafeed_id} - 8 parameters',
    methods: ['PUT'],
    patterns: ['_ml/datafeeds/{datafeed_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-datafeed',
    parameterTypes: {
      pathParams: ['datafeed_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_throttled',
        'ignore_unavailable',
      ],
      bodyParams: ['job_id', 'indices', 'query', 'frequency', 'scroll_size'],
    },
    paramsSchema: z.object({
      datafeed_id: z.string().describe('Path parameter: datafeed_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_throttled: z.boolean().optional().describe('Boolean flag: ignore_throttled'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      job_id: z.string().optional().describe('Job ID'),
      indices: z.array(z.object({}).passthrough()).optional().describe('Index privileges'),
      query: z
        .union([z.string(), z.object({}).passthrough()])
        .optional()
        .describe('Query (ES-QL string or Elasticsearch Query DSL)'),
      frequency: z.string().optional().describe('Frequency'),
      scroll_size: z.number().optional().describe('Scroll size'),
    }),
    outputSchema: z.any().describe('Response from ml.put_datafeed API'),
  },
  {
    type: 'elasticsearch.ml.put_filter',
    connectorIdRequired: false,
    description: 'PUT _ml/filters/{filter_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_ml/filters/{filter_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-filter',
    parameterTypes: {
      pathParams: ['filter_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      filter_id: z.string().describe('Path parameter: filter_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.put_filter API'),
  },
  {
    type: 'elasticsearch.ml.put_job',
    connectorIdRequired: false,
    description: 'PUT _ml/anomaly_detectors/{job_id} - 8 parameters',
    methods: ['PUT'],
    patterns: ['_ml/anomaly_detectors/{job_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-job',
    parameterTypes: {
      pathParams: ['job_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_throttled',
        'ignore_unavailable',
      ],
      bodyParams: ['job_id', 'description', 'analysis_config', 'data_description'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_throttled: z.boolean().optional().describe('Boolean flag: ignore_throttled'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      description: z.string().optional().describe('Description'),
      analysis_config: z.object({}).passthrough().optional().describe('Analysis configuration'),
      data_description: z.object({}).passthrough().optional().describe('Data description'),
    }),
    outputSchema: z.any().describe('Response from ml.put_job API'),
  },
  {
    type: 'elasticsearch.ml.put_trained_model',
    connectorIdRequired: false,
    description: 'PUT _ml/trained_models/{model_id} - 6 parameters',
    methods: ['PUT'],
    patterns: ['_ml/trained_models/{model_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-trained-model',
    parameterTypes: {
      pathParams: ['model_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'defer_definition_decompression',
        'wait_for_completion',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      model_id: z.string().describe('Path parameter: model_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      defer_definition_decompression: z
        .boolean()
        .optional()
        .describe('Boolean flag: defer_definition_decompression'),
      wait_for_completion: z.boolean().optional().describe('Boolean flag: wait_for_completion'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.put_trained_model API'),
  },
  {
    type: 'elasticsearch.ml.put_trained_model_alias',
    connectorIdRequired: false,
    description: 'PUT _ml/trained_models/{model_id}/model_aliases/{model_alias} - 5 parameters',
    methods: ['PUT'],
    patterns: ['_ml/trained_models/{model_id}/model_aliases/{model_alias}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-trained-model-alias',
    parameterTypes: {
      pathParams: ['model_id', 'model_alias'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'reassign'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      model_id: z.string().describe('Path parameter: model_id (required)'),
      model_alias: z.string().describe('Path parameter: model_alias (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      reassign: z.boolean().optional().describe('Boolean flag: reassign'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.put_trained_model_alias API'),
  },
  {
    type: 'elasticsearch.ml.put_trained_model_definition_part',
    connectorIdRequired: false,
    description: 'PUT _ml/trained_models/{model_id}/definition/{part} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_ml/trained_models/{model_id}/definition/{part}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-trained-model-definition-part',
    parameterTypes: {
      pathParams: ['model_id', 'part'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      model_id: z.string().describe('Path parameter: model_id (required)'),
      part: z.string().describe('Path parameter: part (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.put_trained_model_definition_part API'),
  },
  {
    type: 'elasticsearch.ml.put_trained_model_vocabulary',
    connectorIdRequired: false,
    description: 'PUT _ml/trained_models/{model_id}/vocabulary - 4 parameters',
    methods: ['PUT'],
    patterns: ['_ml/trained_models/{model_id}/vocabulary'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-trained-model-vocabulary',
    parameterTypes: {
      pathParams: ['model_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      model_id: z.string().describe('Path parameter: model_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.put_trained_model_vocabulary API'),
  },
  {
    type: 'elasticsearch.ml.reset_job',
    connectorIdRequired: false,
    description: 'POST _ml/anomaly_detectors/{job_id}/_reset - 6 parameters',
    methods: ['POST'],
    patterns: ['_ml/anomaly_detectors/{job_id}/_reset'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-reset-job',
    parameterTypes: {
      pathParams: ['job_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'wait_for_completion',
        'delete_user_annotations',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      wait_for_completion: z.boolean().optional().describe('Boolean flag: wait_for_completion'),
      delete_user_annotations: z
        .boolean()
        .optional()
        .describe('Boolean flag: delete_user_annotations'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.reset_job API'),
  },
  {
    type: 'elasticsearch.ml.revert_model_snapshot',
    connectorIdRequired: false,
    description:
      'POST _ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_revert - 5 parameters',
    methods: ['POST'],
    patterns: ['_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_revert'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-revert-model-snapshot',
    parameterTypes: {
      pathParams: ['job_id', 'snapshot_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'delete_intervening_results'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      snapshot_id: z.string().describe('Path parameter: snapshot_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      delete_intervening_results: z
        .boolean()
        .optional()
        .describe('Boolean flag: delete_intervening_results'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.revert_model_snapshot API'),
  },
  {
    type: 'elasticsearch.ml.set_upgrade_mode',
    connectorIdRequired: false,
    description: 'POST _ml/set_upgrade_mode - 6 parameters',
    methods: ['POST'],
    patterns: ['_ml/set_upgrade_mode'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-set-upgrade-mode',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'enabled', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      enabled: z.boolean().optional().describe('Boolean flag: enabled'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.set_upgrade_mode API'),
  },
  {
    type: 'elasticsearch.ml.start_data_frame_analytics',
    connectorIdRequired: false,
    description: 'POST _ml/data_frame/analytics/{id}/_start - 5 parameters',
    methods: ['POST'],
    patterns: ['_ml/data_frame/analytics/{id}/_start'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-start-data-frame-analytics',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z.enum(['20s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.start_data_frame_analytics API'),
  },
  {
    type: 'elasticsearch.ml.start_datafeed',
    connectorIdRequired: false,
    description: 'POST _ml/datafeeds/{datafeed_id}/_start - 7 parameters',
    methods: ['POST'],
    patterns: ['_ml/datafeeds/{datafeed_id}/_start'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-start-datafeed',
    parameterTypes: {
      pathParams: ['datafeed_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'end', 'start', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      datafeed_id: z.string().describe('Path parameter: datafeed_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      end: z.array(z.string()).optional().describe('Array parameter: end'),
      start: z.array(z.string()).optional().describe('Array parameter: start'),
      timeout: z.enum(['20s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.start_datafeed API'),
  },
  {
    type: 'elasticsearch.ml.start_trained_model_deployment',
    connectorIdRequired: false,
    description: 'POST _ml/trained_models/{model_id}/deployment/_start - 12 parameters',
    methods: ['POST'],
    patterns: ['_ml/trained_models/{model_id}/deployment/_start'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-start-trained-model-deployment',
    parameterTypes: {
      pathParams: ['model_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'cache_size',
        'deployment_id',
        'number_of_allocations',
        'priority',
        'queue_capacity',
        'threads_per_allocation',
        'timeout',
        'wait_for',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      model_id: z.string().describe('Path parameter: model_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      cache_size: z.array(z.string()).optional().describe('Array parameter: cache_size'),
      deployment_id: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: deployment_id'),
      number_of_allocations: z
        .union([z.number(), z.array(z.number()), z.enum(['1'])])
        .optional()
        .describe('Numeric parameter: number_of_allocations'),
      priority: z.enum(['normal', 'low']).optional().describe('Enum parameter: priority'),
      queue_capacity: z
        .union([z.number(), z.array(z.number()), z.enum(['1024'])])
        .optional()
        .describe('Numeric parameter: queue_capacity'),
      threads_per_allocation: z
        .union([z.number(), z.array(z.number()), z.enum(['1'])])
        .optional()
        .describe('Numeric parameter: threads_per_allocation'),
      timeout: z.enum(['20s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      wait_for: z
        .enum(['started', 'starting', 'fully_allocated'])
        .optional()
        .describe('Enum parameter: wait_for'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.start_trained_model_deployment API'),
  },
  {
    type: 'elasticsearch.ml.stop_data_frame_analytics',
    connectorIdRequired: false,
    description: 'POST _ml/data_frame/analytics/{id}/_stop - 7 parameters',
    methods: ['POST'],
    patterns: ['_ml/data_frame/analytics/{id}/_stop'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-stop-data-frame-analytics',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_match',
        'force',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      force: z.boolean().optional().describe('Boolean flag: force'),
      timeout: z.enum(['20s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.stop_data_frame_analytics API'),
  },
  {
    type: 'elasticsearch.ml.stop_datafeed',
    connectorIdRequired: false,
    description: 'POST _ml/datafeeds/{datafeed_id}/_stop - 7 parameters',
    methods: ['POST'],
    patterns: ['_ml/datafeeds/{datafeed_id}/_stop'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-stop-datafeed',
    parameterTypes: {
      pathParams: ['datafeed_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_match',
        'force',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      datafeed_id: z.string().describe('Path parameter: datafeed_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      force: z.boolean().optional().describe('Boolean flag: force'),
      timeout: z.enum(['20s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.stop_datafeed API'),
  },
  {
    type: 'elasticsearch.ml.stop_trained_model_deployment',
    connectorIdRequired: false,
    description: 'POST _ml/trained_models/{model_id}/deployment/_stop - 6 parameters',
    methods: ['POST'],
    patterns: ['_ml/trained_models/{model_id}/deployment/_stop'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-stop-trained-model-deployment',
    parameterTypes: {
      pathParams: ['model_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'allow_no_match', 'force'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      model_id: z.string().describe('Path parameter: model_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      force: z.boolean().optional().describe('Boolean flag: force'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.stop_trained_model_deployment API'),
  },
  {
    type: 'elasticsearch.ml.update_data_frame_analytics',
    connectorIdRequired: false,
    description: 'POST _ml/data_frame/analytics/{id}/_update - 4 parameters',
    methods: ['POST'],
    patterns: ['_ml/data_frame/analytics/{id}/_update'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-data-frame-analytics',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from ml.update_data_frame_analytics API'),
  },
  {
    type: 'elasticsearch.ml.update_datafeed',
    connectorIdRequired: false,
    description: 'POST _ml/datafeeds/{datafeed_id}/_update - 8 parameters',
    methods: ['POST'],
    patterns: ['_ml/datafeeds/{datafeed_id}/_update'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-datafeed',
    parameterTypes: {
      pathParams: ['datafeed_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_throttled',
        'ignore_unavailable',
      ],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      datafeed_id: z.string().describe('Path parameter: datafeed_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_throttled: z.boolean().optional().describe('Boolean flag: ignore_throttled'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from ml.update_datafeed API'),
  },
  {
    type: 'elasticsearch.ml.update_filter',
    connectorIdRequired: false,
    description: 'POST _ml/filters/{filter_id}/_update - 4 parameters',
    methods: ['POST'],
    patterns: ['_ml/filters/{filter_id}/_update'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-filter',
    parameterTypes: {
      pathParams: ['filter_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      filter_id: z.string().describe('Path parameter: filter_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from ml.update_filter API'),
  },
  {
    type: 'elasticsearch.ml.update_job',
    connectorIdRequired: false,
    description: 'POST _ml/anomaly_detectors/{job_id}/_update - 4 parameters',
    methods: ['POST'],
    patterns: ['_ml/anomaly_detectors/{job_id}/_update'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-job',
    parameterTypes: {
      pathParams: ['job_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from ml.update_job API'),
  },
  {
    type: 'elasticsearch.ml.update_model_snapshot',
    connectorIdRequired: false,
    description:
      'POST _ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_update - 4 parameters',
    methods: ['POST'],
    patterns: ['_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_update'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-model-snapshot',
    parameterTypes: {
      pathParams: ['job_id', 'snapshot_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      snapshot_id: z.string().describe('Path parameter: snapshot_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from ml.update_model_snapshot API'),
  },
  {
    type: 'elasticsearch.ml.update_trained_model_deployment',
    connectorIdRequired: false,
    description: 'POST _ml/trained_models/{model_id}/deployment/_update - 5 parameters',
    methods: ['POST'],
    patterns: ['_ml/trained_models/{model_id}/deployment/_update'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-trained-model-deployment',
    parameterTypes: {
      pathParams: ['model_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'number_of_allocations'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      model_id: z.string().describe('Path parameter: model_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      number_of_allocations: z
        .union([z.number(), z.array(z.number()), z.enum(['1'])])
        .optional()
        .describe('Numeric parameter: number_of_allocations'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from ml.update_trained_model_deployment API'),
  },
  {
    type: 'elasticsearch.ml.upgrade_job_snapshot',
    connectorIdRequired: false,
    description:
      'POST _ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_upgrade - 6 parameters',
    methods: ['POST'],
    patterns: ['_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_upgrade'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-upgrade-job-snapshot',
    parameterTypes: {
      pathParams: ['job_id', 'snapshot_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'wait_for_completion',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      snapshot_id: z.string().describe('Path parameter: snapshot_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      wait_for_completion: z.boolean().optional().describe('Boolean flag: wait_for_completion'),
      timeout: z.enum(['30m', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.upgrade_job_snapshot API'),
  },
  {
    type: 'elasticsearch.ml.validate',
    connectorIdRequired: false,
    description: 'POST _ml/anomaly_detectors/_validate - 4 parameters',
    methods: ['POST'],
    patterns: ['_ml/anomaly_detectors/_validate'],
    isInternal: true,
    documentation: 'https://www.elastic.co/guide/en/machine-learning/current/ml-jobs.html',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.validate API'),
  },
  {
    type: 'elasticsearch.ml.validate_detector',
    connectorIdRequired: false,
    description: 'POST _ml/anomaly_detectors/_validate/detector - 4 parameters',
    methods: ['POST'],
    patterns: ['_ml/anomaly_detectors/_validate/detector'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.validate_detector API'),
  },
  {
    type: 'elasticsearch.monitoring.bulk',
    connectorIdRequired: false,
    description: 'POST/PUT _monitoring/bulk | _monitoring/{type}/bulk - 7 parameters',
    methods: ['POST', 'PUT'],
    patterns: ['_monitoring/bulk', '_monitoring/{type}/bulk'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch',
    parameterTypes: {
      pathParams: ['type'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'system_id',
        'system_api_version',
        'interval',
      ],
      bodyParams: ['operations'],
    },
    paramsSchema: z.object({
      type: z.string().describe('Path parameter: type (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      system_id: z.union([z.string(), z.number()]).optional().describe('Parameter: system_id'),
      system_api_version: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: system_api_version'),
      interval: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: interval'),
      operations: z.array(z.object({}).passthrough()).optional().describe('Bulk operations'),
    }),
    outputSchema: z.any().describe('Response from monitoring.bulk API'),
  },
  {
    type: 'elasticsearch.msearch',
    connectorIdRequired: false,
    description: 'GET/POST _msearch | {index}/_msearch - 17 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_msearch', '{index}/_msearch'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-msearch',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'ccs_minimize_roundtrips',
        'expand_wildcards',
        'ignore_throttled',
        'ignore_unavailable',
        'include_named_queries_score',
        'max_concurrent_searches',
        'max_concurrent_shard_requests',
        'pre_filter_shard_size',
        'rest_total_hits_as_int',
        'routing',
        'search_type',
        'typed_keys',
      ],
      bodyParams: [
        'query',
        'size',
        'from',
        'sort',
        'aggs',
        'aggregations',
        'post_filter',
        'highlight',
        '_source',
        'index',
      ],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      ccs_minimize_roundtrips: z
        .boolean()
        .optional()
        .describe('Boolean flag: ccs_minimize_roundtrips'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_throttled: z.boolean().optional().describe('Boolean flag: ignore_throttled'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      include_named_queries_score: z
        .boolean()
        .optional()
        .describe('Boolean flag: include_named_queries_score'),
      max_concurrent_searches: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: max_concurrent_searches'),
      max_concurrent_shard_requests: z
        .union([z.number(), z.array(z.number()), z.enum(['5'])])
        .optional()
        .describe('Numeric parameter: max_concurrent_shard_requests'),
      pre_filter_shard_size: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: pre_filter_shard_size'),
      rest_total_hits_as_int: z
        .boolean()
        .optional()
        .describe('Boolean flag: rest_total_hits_as_int'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      search_type: z
        .enum(['query_then_fetch', 'dfs_query_then_fetch'])
        .optional()
        .describe('Enum parameter: search_type'),
      typed_keys: z.boolean().optional().describe('Boolean flag: typed_keys'),
      query: z
        .union([z.string(), z.object({}).passthrough()])
        .optional()
        .describe('Query (ES-QL string or Elasticsearch Query DSL)'),
      size: z.number().optional().describe('Number of results to return'),
      from: z.number().optional().describe('Starting offset'),
      sort: z
        .union([z.array(z.any()), z.object({}).passthrough()])
        .optional()
        .describe('Sort specification'),
      aggs: z.object({}).passthrough().optional().describe('Aggregations'),
      aggregations: z.object({}).passthrough().optional().describe('Aggregations'),
      post_filter: z.object({}).passthrough().optional().describe('Post filter'),
      highlight: z.object({}).passthrough().optional().describe('Highlighting configuration'),
      _source: z
        .union([z.boolean(), z.array(z.string()), z.object({}).passthrough()])
        .optional()
        .describe('Source field filtering'),
    }),
    outputSchema: z.any().describe('Response from msearch API'),
  },
  {
    type: 'elasticsearch.msearch_template',
    connectorIdRequired: false,
    description: 'GET/POST _msearch/template | {index}/_msearch/template - 9 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_msearch/template', '{index}/_msearch/template'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-msearch-template',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'ccs_minimize_roundtrips',
        'max_concurrent_searches',
        'search_type',
        'rest_total_hits_as_int',
        'typed_keys',
      ],
      bodyParams: [
        'query',
        'size',
        'from',
        'sort',
        'aggs',
        'aggregations',
        'post_filter',
        'highlight',
        '_source',
        'index',
      ],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      ccs_minimize_roundtrips: z
        .boolean()
        .optional()
        .describe('Boolean flag: ccs_minimize_roundtrips'),
      max_concurrent_searches: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: max_concurrent_searches'),
      search_type: z
        .enum(['query_then_fetch', 'dfs_query_then_fetch'])
        .optional()
        .describe('Enum parameter: search_type'),
      rest_total_hits_as_int: z
        .boolean()
        .optional()
        .describe('Boolean flag: rest_total_hits_as_int'),
      typed_keys: z.boolean().optional().describe('Boolean flag: typed_keys'),
      query: z
        .union([z.string(), z.object({}).passthrough()])
        .optional()
        .describe('Query (ES-QL string or Elasticsearch Query DSL)'),
      size: z.number().optional().describe('Number of results to return'),
      from: z.number().optional().describe('Starting offset'),
      sort: z
        .union([z.array(z.any()), z.object({}).passthrough()])
        .optional()
        .describe('Sort specification'),
      aggs: z.object({}).passthrough().optional().describe('Aggregations'),
      aggregations: z.object({}).passthrough().optional().describe('Aggregations'),
      post_filter: z.object({}).passthrough().optional().describe('Post filter'),
      highlight: z.object({}).passthrough().optional().describe('Highlighting configuration'),
      _source: z
        .union([z.boolean(), z.array(z.string()), z.object({}).passthrough()])
        .optional()
        .describe('Source field filtering'),
    }),
    outputSchema: z.any().describe('Response from msearch_template API'),
  },
  {
    type: 'elasticsearch.mtermvectors',
    connectorIdRequired: false,
    description: 'GET/POST _mtermvectors | {index}/_mtermvectors - 16 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_mtermvectors', '{index}/_mtermvectors'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-mtermvectors',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'ids',
        'fields',
        'field_statistics',
        'offsets',
        'payloads',
        'positions',
        'preference',
        'realtime',
        'routing',
        'term_statistics',
        'version',
        'version_type',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      ids: z.union([z.string(), z.number()]).optional().describe('Parameter: ids'),
      fields: z.array(z.string()).optional().describe('Array parameter: fields'),
      field_statistics: z.boolean().optional().describe('Boolean flag: field_statistics'),
      offsets: z.boolean().optional().describe('Boolean flag: offsets'),
      payloads: z.boolean().optional().describe('Boolean flag: payloads'),
      positions: z.boolean().optional().describe('Boolean flag: positions'),
      preference: z.union([z.string(), z.number()]).optional().describe('Parameter: preference'),
      realtime: z.boolean().optional().describe('Boolean flag: realtime'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      term_statistics: z.boolean().optional().describe('Boolean flag: term_statistics'),
      version: z.union([z.string(), z.number()]).optional().describe('Parameter: version'),
      version_type: z
        .enum(['internal', 'external', 'external_gte', 'force'])
        .optional()
        .describe('Enum parameter: version_type'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from mtermvectors API'),
  },
  {
    type: 'elasticsearch.nodes.clear_repositories_metering_archive',
    connectorIdRequired: false,
    description:
      'DELETE _nodes/{node_id}/_repositories_metering/{max_archive_version} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_nodes/{node_id}/_repositories_metering/{max_archive_version}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-clear-repositories-metering-archive',
    parameterTypes: {
      pathParams: ['node_id', 'max_archive_version'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      node_id: z.string().describe('Path parameter: node_id (required)'),
      max_archive_version: z.string().describe('Path parameter: max_archive_version (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from nodes.clear_repositories_metering_archive API'),
  },
  {
    type: 'elasticsearch.nodes.get_repositories_metering_info',
    connectorIdRequired: false,
    description: 'GET _nodes/{node_id}/_repositories_metering - 4 parameters',
    methods: ['GET'],
    patterns: ['_nodes/{node_id}/_repositories_metering'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-get-repositories-metering-info',
    parameterTypes: {
      pathParams: ['node_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      node_id: z.string().describe('Path parameter: node_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from nodes.get_repositories_metering_info API'),
  },
  {
    type: 'elasticsearch.nodes.hot_threads',
    connectorIdRequired: false,
    description: 'GET _nodes/hot_threads | _nodes/{node_id}/hot_threads - 11 parameters',
    methods: ['GET'],
    patterns: ['_nodes/hot_threads', '_nodes/{node_id}/hot_threads'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-hot-threads',
    parameterTypes: {
      pathParams: ['node_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'ignore_idle_threads',
        'interval',
        'snapshots',
        'threads',
        'timeout',
        'type',
        'sort',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      node_id: z.string().describe('Path parameter: node_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      ignore_idle_threads: z.boolean().optional().describe('Boolean flag: ignore_idle_threads'),
      interval: z.enum(['500ms', '-1', '0']).optional().describe('Enum parameter: interval'),
      snapshots: z
        .union([z.number(), z.array(z.number()), z.enum(['10'])])
        .optional()
        .describe('Numeric parameter: snapshots'),
      threads: z
        .union([z.number(), z.array(z.number()), z.enum(['3'])])
        .optional()
        .describe('Numeric parameter: threads'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      type: z
        .enum(['cpu', 'wait', 'block', 'gpu', 'mem'])
        .optional()
        .describe('Enum parameter: type'),
      sort: z
        .enum(['cpu', 'wait', 'block', 'gpu', 'mem'])
        .optional()
        .describe('Enum parameter: sort'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from nodes.hot_threads API'),
  },
  {
    type: 'elasticsearch.nodes.info',
    connectorIdRequired: false,
    description:
      'GET _nodes | _nodes/{node_id} | _nodes/{metric} | _nodes/{node_id}/{metric} - 6 parameters',
    methods: ['GET'],
    patterns: ['_nodes', '_nodes/{node_id}', '_nodes/{metric}', '_nodes/{node_id}/{metric}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-info',
    parameterTypes: {
      pathParams: ['node_id', 'metric'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'flat_settings', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      node_id: z.string().describe('Path parameter: node_id (required)'),
      metric: z.string().describe('Path parameter: metric (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      flat_settings: z.boolean().optional().describe('Boolean flag: flat_settings'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from nodes.info API'),
  },
  {
    type: 'elasticsearch.nodes.reload_secure_settings',
    connectorIdRequired: false,
    description:
      'POST _nodes/reload_secure_settings | _nodes/{node_id}/reload_secure_settings - 5 parameters',
    methods: ['POST'],
    patterns: ['_nodes/reload_secure_settings', '_nodes/{node_id}/reload_secure_settings'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-reload-secure-settings',
    parameterTypes: {
      pathParams: ['node_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      node_id: z.string().describe('Path parameter: node_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from nodes.reload_secure_settings API'),
  },
  {
    type: 'elasticsearch.nodes.stats',
    connectorIdRequired: false,
    description:
      'GET _nodes/stats | _nodes/{node_id}/stats | _nodes/stats/{metric} | _nodes/{node_id}/stats/{metric} | _nodes/stats/{metric}/{index_metric} | _nodes/{node_id}/stats/{metric}/{index_metric} - 13 parameters',
    methods: ['GET'],
    patterns: [
      '_nodes/stats',
      '_nodes/{node_id}/stats',
      '_nodes/stats/{metric}',
      '_nodes/{node_id}/stats/{metric}',
      '_nodes/stats/{metric}/{index_metric}',
      '_nodes/{node_id}/stats/{metric}/{index_metric}',
    ],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-stats',
    parameterTypes: {
      pathParams: ['node_id', 'metric', 'index_metric'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'completion_fields',
        'fielddata_fields',
        'fields',
        'groups',
        'include_segment_file_sizes',
        'level',
        'timeout',
        'types',
        'include_unloaded_segments',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      node_id: z.string().describe('Path parameter: node_id (required)'),
      metric: z.string().describe('Path parameter: metric (required)'),
      index_metric: z.string().describe('Path parameter: index_metric (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      completion_fields: z
        .array(z.string())
        .optional()
        .describe('Array parameter: completion_fields'),
      fielddata_fields: z
        .array(z.string())
        .optional()
        .describe('Array parameter: fielddata_fields'),
      fields: z.array(z.string()).optional().describe('Array parameter: fields'),
      groups: z.boolean().optional().describe('Boolean flag: groups'),
      include_segment_file_sizes: z
        .boolean()
        .optional()
        .describe('Boolean flag: include_segment_file_sizes'),
      level: z.enum(['cluster', 'indices', 'shards']).optional().describe('Enum parameter: level'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      types: z.union([z.string(), z.number()]).optional().describe('Parameter: types'),
      include_unloaded_segments: z
        .boolean()
        .optional()
        .describe('Boolean flag: include_unloaded_segments'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from nodes.stats API'),
  },
  {
    type: 'elasticsearch.nodes.usage',
    connectorIdRequired: false,
    description:
      'GET _nodes/usage | _nodes/{node_id}/usage | _nodes/usage/{metric} | _nodes/{node_id}/usage/{metric} - 5 parameters',
    methods: ['GET'],
    patterns: [
      '_nodes/usage',
      '_nodes/{node_id}/usage',
      '_nodes/usage/{metric}',
      '_nodes/{node_id}/usage/{metric}',
    ],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-usage',
    parameterTypes: {
      pathParams: ['node_id', 'metric'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      node_id: z.string().describe('Path parameter: node_id (required)'),
      metric: z.string().describe('Path parameter: metric (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from nodes.usage API'),
  },
  {
    type: 'elasticsearch.open_point_in_time',
    connectorIdRequired: false,
    description: 'POST {index}/_pit - 11 parameters',
    methods: ['POST'],
    patterns: ['{index}/_pit'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-open-point-in-time',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'keep_alive',
        'ignore_unavailable',
        'preference',
        'routing',
        'expand_wildcards',
        'allow_partial_search_results',
        'max_concurrent_shard_requests',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      keep_alive: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: keep_alive'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      preference: z.union([z.string(), z.number()]).optional().describe('Parameter: preference'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      allow_partial_search_results: z
        .boolean()
        .optional()
        .describe('Boolean flag: allow_partial_search_results'),
      max_concurrent_shard_requests: z
        .union([z.number(), z.array(z.number()), z.enum(['5'])])
        .optional()
        .describe('Numeric parameter: max_concurrent_shard_requests'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from open_point_in_time API'),
  },
  {
    type: 'elasticsearch.ping',
    connectorIdRequired: false,
    description: 'HEAD elasticsearch.ping - 4 parameters',
    methods: ['HEAD'],
    patterns: [''],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-cluster',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ping API'),
  },
  {
    type: 'elasticsearch.profiling.flamegraph',
    connectorIdRequired: false,
    description: 'POST _profiling/flamegraph - 0 parameters',
    methods: ['POST'],
    patterns: ['_profiling/flamegraph'],
    isInternal: true,
    documentation: 'https://www.elastic.co/guide/en/observability/current/universal-profiling.html',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from profiling.flamegraph API'),
  },
  {
    type: 'elasticsearch.profiling.stacktraces',
    connectorIdRequired: false,
    description: 'POST _profiling/stacktraces - 0 parameters',
    methods: ['POST'],
    patterns: ['_profiling/stacktraces'],
    isInternal: true,
    documentation: 'https://www.elastic.co/guide/en/observability/current/universal-profiling.html',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from profiling.stacktraces API'),
  },
  {
    type: 'elasticsearch.profiling.status',
    connectorIdRequired: false,
    description: 'GET _profiling/status - 0 parameters',
    methods: ['GET'],
    patterns: ['_profiling/status'],
    isInternal: true,
    documentation: 'https://www.elastic.co/guide/en/observability/current/universal-profiling.html',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from profiling.status API'),
  },
  {
    type: 'elasticsearch.profiling.topn_functions',
    connectorIdRequired: false,
    description: 'POST _profiling/topn/functions - 0 parameters',
    methods: ['POST'],
    patterns: ['_profiling/topn/functions'],
    isInternal: true,
    documentation: 'https://www.elastic.co/guide/en/observability/current/universal-profiling.html',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from profiling.topn_functions API'),
  },
  {
    type: 'elasticsearch.put_script',
    connectorIdRequired: false,
    description: 'PUT/POST _scripts/{id} | _scripts/{id}/{context} - 7 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_scripts/{id}', '_scripts/{id}/{context}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-put-script',
    parameterTypes: {
      pathParams: ['id', 'context'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'context',
        'master_timeout',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      context: z.string().describe('Path parameter: context (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from put_script API'),
  },
  {
    type: 'elasticsearch.query_rules.delete_rule',
    connectorIdRequired: false,
    description: 'DELETE _query_rules/{ruleset_id}/_rule/{rule_id} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_query_rules/{ruleset_id}/_rule/{rule_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-delete-rule',
    parameterTypes: {
      pathParams: ['ruleset_id', 'rule_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      ruleset_id: z.string().describe('Path parameter: ruleset_id (required)'),
      rule_id: z.string().describe('Path parameter: rule_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from query_rules.delete_rule API'),
  },
  {
    type: 'elasticsearch.query_rules.delete_ruleset',
    connectorIdRequired: false,
    description: 'DELETE _query_rules/{ruleset_id} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_query_rules/{ruleset_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-delete-ruleset',
    parameterTypes: {
      pathParams: ['ruleset_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      ruleset_id: z.string().describe('Path parameter: ruleset_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from query_rules.delete_ruleset API'),
  },
  {
    type: 'elasticsearch.query_rules.get_rule',
    connectorIdRequired: false,
    description: 'GET _query_rules/{ruleset_id}/_rule/{rule_id} - 4 parameters',
    methods: ['GET'],
    patterns: ['_query_rules/{ruleset_id}/_rule/{rule_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-get-rule',
    parameterTypes: {
      pathParams: ['ruleset_id', 'rule_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      ruleset_id: z.string().describe('Path parameter: ruleset_id (required)'),
      rule_id: z.string().describe('Path parameter: rule_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from query_rules.get_rule API'),
  },
  {
    type: 'elasticsearch.query_rules.get_ruleset',
    connectorIdRequired: false,
    description: 'GET _query_rules/{ruleset_id} - 4 parameters',
    methods: ['GET'],
    patterns: ['_query_rules/{ruleset_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-get-ruleset',
    parameterTypes: {
      pathParams: ['ruleset_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      ruleset_id: z.string().describe('Path parameter: ruleset_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from query_rules.get_ruleset API'),
  },
  {
    type: 'elasticsearch.query_rules.list_rulesets',
    connectorIdRequired: false,
    description: 'GET _query_rules - 6 parameters',
    methods: ['GET'],
    patterns: ['_query_rules'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-list-rulesets',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'from', 'size'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      size: z.union([z.string(), z.number()]).optional().describe('Parameter: size'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from query_rules.list_rulesets API'),
  },
  {
    type: 'elasticsearch.query_rules.put_rule',
    connectorIdRequired: false,
    description: 'PUT _query_rules/{ruleset_id}/_rule/{rule_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_query_rules/{ruleset_id}/_rule/{rule_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-put-rule',
    parameterTypes: {
      pathParams: ['ruleset_id', 'rule_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      ruleset_id: z.string().describe('Path parameter: ruleset_id (required)'),
      rule_id: z.string().describe('Path parameter: rule_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from query_rules.put_rule API'),
  },
  {
    type: 'elasticsearch.query_rules.put_ruleset',
    connectorIdRequired: false,
    description: 'PUT _query_rules/{ruleset_id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_query_rules/{ruleset_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-put-ruleset',
    parameterTypes: {
      pathParams: ['ruleset_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      ruleset_id: z.string().describe('Path parameter: ruleset_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from query_rules.put_ruleset API'),
  },
  {
    type: 'elasticsearch.query_rules.test',
    connectorIdRequired: false,
    description: 'POST _query_rules/{ruleset_id}/_test - 4 parameters',
    methods: ['POST'],
    patterns: ['_query_rules/{ruleset_id}/_test'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-test',
    parameterTypes: {
      pathParams: ['ruleset_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      ruleset_id: z.string().describe('Path parameter: ruleset_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from query_rules.test API'),
  },
  {
    type: 'elasticsearch.rank_eval',
    connectorIdRequired: false,
    description: 'GET/POST _rank_eval | {index}/_rank_eval - 8 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_rank_eval', '{index}/_rank_eval'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rank-eval',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_unavailable',
        'search_type',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      search_type: z.union([z.string(), z.number()]).optional().describe('Parameter: search_type'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from rank_eval API'),
  },
  {
    type: 'elasticsearch.reindex',
    connectorIdRequired: false,
    description: 'POST _reindex - 12 parameters',
    methods: ['POST'],
    patterns: ['_reindex'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-reindex',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'refresh',
        'requests_per_second',
        'scroll',
        'slices',
        'timeout',
        'wait_for_active_shards',
        'wait_for_completion',
        'require_alias',
      ],
      bodyParams: ['source', 'dest', 'script', 'conflicts'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.boolean().optional().describe('Boolean flag: refresh'),
      requests_per_second: z
        .union([z.number(), z.array(z.number()), z.enum(['-1'])])
        .optional()
        .describe('Numeric parameter: requests_per_second'),
      scroll: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: scroll'),
      slices: z.enum(['1', 'auto']).optional().describe('Enum parameter: slices'),
      timeout: z.enum(['1m', '-1', '0']).optional().describe('Enum parameter: timeout'),
      wait_for_active_shards: z
        .enum(['1', 'all', 'index-setting'])
        .optional()
        .describe('Enum parameter: wait_for_active_shards'),
      wait_for_completion: z.boolean().optional().describe('Boolean flag: wait_for_completion'),
      require_alias: z.boolean().optional().describe('Boolean flag: require_alias'),
      source: z.object({}).passthrough().optional().describe('Source configuration'),
      dest: z.object({}).passthrough().optional().describe('Destination configuration'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      conflicts: z.enum(['abort', 'proceed']).optional().describe('Conflict resolution'),
    }),
    outputSchema: z.any().describe('Response from reindex API'),
  },
  {
    type: 'elasticsearch.reindex_rethrottle',
    connectorIdRequired: false,
    description: 'POST _reindex/{task_id}/_rethrottle - 5 parameters',
    methods: ['POST'],
    patterns: ['_reindex/{task_id}/_rethrottle'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-reindex',
    parameterTypes: {
      pathParams: ['task_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'requests_per_second'],
      bodyParams: ['source', 'dest', 'script', 'conflicts'],
    },
    paramsSchema: z.object({
      task_id: z.string().describe('Path parameter: task_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      requests_per_second: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: requests_per_second'),
      source: z.object({}).passthrough().optional().describe('Source configuration'),
      dest: z.object({}).passthrough().optional().describe('Destination configuration'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      conflicts: z.enum(['abort', 'proceed']).optional().describe('Conflict resolution'),
    }),
    outputSchema: z.any().describe('Response from reindex_rethrottle API'),
  },
  {
    type: 'elasticsearch.render_search_template',
    connectorIdRequired: false,
    description: 'GET/POST _render/template | _render/template/{id} - 4 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_render/template', '_render/template/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-render-search-template',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['template', 'params', 'explain', 'profile'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      template: z.object({}).passthrough().optional().describe('Template configuration'),
      params: z.array(z.any()).optional().describe('Query parameters'),
      explain: z.boolean().optional().describe('Explain query'),
      profile: z.boolean().optional().describe('Enable profiling'),
    }),
    outputSchema: z.any().describe('Response from render_search_template API'),
  },
  {
    type: 'elasticsearch.rollup.delete_job',
    connectorIdRequired: false,
    description: 'DELETE _rollup/job/{id} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_rollup/job/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-delete-job',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from rollup.delete_job API'),
  },
  {
    type: 'elasticsearch.rollup.get_jobs',
    connectorIdRequired: false,
    description: 'GET _rollup/job/{id} | _rollup/job - 4 parameters',
    methods: ['GET'],
    patterns: ['_rollup/job/{id}', '_rollup/job'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-get-jobs',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from rollup.get_jobs API'),
  },
  {
    type: 'elasticsearch.rollup.get_rollup_caps',
    connectorIdRequired: false,
    description: 'GET _rollup/data/{id} | _rollup/data - 4 parameters',
    methods: ['GET'],
    patterns: ['_rollup/data/{id}', '_rollup/data'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-get-rollup-caps',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from rollup.get_rollup_caps API'),
  },
  {
    type: 'elasticsearch.rollup.get_rollup_index_caps',
    connectorIdRequired: false,
    description: 'GET {index}/_rollup/data - 4 parameters',
    methods: ['GET'],
    patterns: ['{index}/_rollup/data'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-get-rollup-index-caps',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from rollup.get_rollup_index_caps API'),
  },
  {
    type: 'elasticsearch.rollup.put_job',
    connectorIdRequired: false,
    description: 'PUT _rollup/job/{id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_rollup/job/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-put-job',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from rollup.put_job API'),
  },
  {
    type: 'elasticsearch.rollup.rollup_search',
    connectorIdRequired: false,
    description: 'GET/POST {index}/_rollup_search - 6 parameters',
    methods: ['GET', 'POST'],
    patterns: ['{index}/_rollup_search'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-rollup-search',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'rest_total_hits_as_int',
        'typed_keys',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      rest_total_hits_as_int: z
        .boolean()
        .optional()
        .describe('Boolean flag: rest_total_hits_as_int'),
      typed_keys: z.boolean().optional().describe('Boolean flag: typed_keys'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from rollup.rollup_search API'),
  },
  {
    type: 'elasticsearch.rollup.start_job',
    connectorIdRequired: false,
    description: 'POST _rollup/job/{id}/_start - 4 parameters',
    methods: ['POST'],
    patterns: ['_rollup/job/{id}/_start'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-start-job',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from rollup.start_job API'),
  },
  {
    type: 'elasticsearch.rollup.stop_job',
    connectorIdRequired: false,
    description: 'POST _rollup/job/{id}/_stop - 6 parameters',
    methods: ['POST'],
    patterns: ['_rollup/job/{id}/_stop'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-stop-job',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'timeout',
        'wait_for_completion',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      wait_for_completion: z.boolean().optional().describe('Boolean flag: wait_for_completion'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from rollup.stop_job API'),
  },
  {
    type: 'elasticsearch.scripts_painless_execute',
    connectorIdRequired: false,
    description: 'GET/POST _scripts/painless/_execute - 4 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_scripts/painless/_execute'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/reference/scripting-languages/painless/painless-api-examples',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from scripts_painless_execute API'),
  },
  {
    type: 'elasticsearch.scroll',
    connectorIdRequired: false,
    description: 'GET/POST _search/scroll | _search/scroll/{scroll_id} - 7 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_search/scroll', '_search/scroll/{scroll_id}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-scroll',
    parameterTypes: {
      pathParams: ['scroll_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'scroll',
        'scroll_id',
        'rest_total_hits_as_int',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      scroll_id: z.string().describe('Path parameter: scroll_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      scroll: z.enum(['1d', '-1', '0']).optional().describe('Enum parameter: scroll'),
      rest_total_hits_as_int: z
        .boolean()
        .optional()
        .describe('Boolean flag: rest_total_hits_as_int'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from scroll API'),
  },
  {
    type: 'elasticsearch.search',
    connectorIdRequired: false,
    description: 'GET/POST _search | {index}/_search - 48 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_search', '{index}/_search'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'allow_partial_search_results',
        'analyzer',
        'analyze_wildcard',
        'batched_reduce_size',
        'ccs_minimize_roundtrips',
        'default_operator',
        'df',
        'docvalue_fields',
        'expand_wildcards',
        'explain',
        'ignore_throttled',
        'ignore_unavailable',
        'include_named_queries_score',
        'lenient',
        'max_concurrent_shard_requests',
        'preference',
        'pre_filter_shard_size',
        'request_cache',
        'routing',
        'scroll',
        'search_type',
        'stats',
        'stored_fields',
        'suggest_field',
        'suggest_mode',
        'suggest_size',
        'suggest_text',
        'terminate_after',
        'timeout',
        'track_total_hits',
        'track_scores',
        'typed_keys',
        'rest_total_hits_as_int',
        'version',
        '_source',
        '_source_excludes',
        '_source_includes',
        'seq_no_primary_term',
        'q',
        'size',
        'from',
        'sort',
        'force_synthetic_source',
      ],
      bodyParams: [
        'query',
        'size',
        'from',
        'sort',
        'aggs',
        'aggregations',
        'post_filter',
        'highlight',
        '_source',
        'fields',
        'track_total_hits',
        'timeout',
      ],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      allow_partial_search_results: z
        .boolean()
        .optional()
        .describe('Boolean flag: allow_partial_search_results'),
      analyzer: z.union([z.string(), z.number()]).optional().describe('Parameter: analyzer'),
      analyze_wildcard: z.boolean().optional().describe('Boolean flag: analyze_wildcard'),
      batched_reduce_size: z
        .union([z.number(), z.array(z.number()), z.enum(['512'])])
        .optional()
        .describe('Numeric parameter: batched_reduce_size'),
      ccs_minimize_roundtrips: z
        .boolean()
        .optional()
        .describe('Boolean flag: ccs_minimize_roundtrips'),
      default_operator: z
        .enum(['and', 'or'])
        .optional()
        .describe('Enum parameter: default_operator'),
      df: z.union([z.string(), z.number()]).optional().describe('Parameter: df'),
      docvalue_fields: z.array(z.string()).optional().describe('Array parameter: docvalue_fields'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      explain: z.boolean().optional().describe('Boolean flag: explain'),
      ignore_throttled: z.boolean().optional().describe('Boolean flag: ignore_throttled'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      include_named_queries_score: z
        .boolean()
        .optional()
        .describe('Boolean flag: include_named_queries_score'),
      lenient: z.boolean().optional().describe('Boolean flag: lenient'),
      max_concurrent_shard_requests: z
        .union([z.number(), z.array(z.number()), z.enum(['5'])])
        .optional()
        .describe('Numeric parameter: max_concurrent_shard_requests'),
      preference: z.union([z.string(), z.number()]).optional().describe('Parameter: preference'),
      pre_filter_shard_size: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: pre_filter_shard_size'),
      request_cache: z.boolean().optional().describe('Boolean flag: request_cache'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      scroll: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: scroll'),
      search_type: z
        .enum(['query_then_fetch', 'dfs_query_then_fetch'])
        .optional()
        .describe('Enum parameter: search_type'),
      stats: z.union([z.string(), z.number()]).optional().describe('Parameter: stats'),
      stored_fields: z.array(z.string()).optional().describe('Array parameter: stored_fields'),
      suggest_field: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: suggest_field'),
      suggest_mode: z
        .enum(['missing', 'popular', 'always'])
        .optional()
        .describe('Enum parameter: suggest_mode'),
      suggest_size: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: suggest_size'),
      suggest_text: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: suggest_text'),
      terminate_after: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: terminate_after'),
      timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: timeout'),
      track_total_hits: z
        .enum(['10000', 'true', 'false'])
        .optional()
        .describe('Enum parameter: track_total_hits'),
      track_scores: z.boolean().optional().describe('Boolean flag: track_scores'),
      typed_keys: z.boolean().optional().describe('Boolean flag: typed_keys'),
      rest_total_hits_as_int: z
        .boolean()
        .optional()
        .describe('Boolean flag: rest_total_hits_as_int'),
      version: z.boolean().optional().describe('Boolean flag: version'),
      _source: z.boolean().optional().describe('Boolean flag: _source'),
      _source_excludes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_excludes'),
      _source_includes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_includes'),
      seq_no_primary_term: z.boolean().optional().describe('Boolean flag: seq_no_primary_term'),
      q: z.union([z.string(), z.number()]).optional().describe('Parameter: q'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['10'])])
        .optional()
        .describe('Numeric parameter: size'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      sort: z.array(z.string()).optional().describe('Array parameter: sort'),
      force_synthetic_source: z
        .boolean()
        .optional()
        .describe('Boolean flag: force_synthetic_source'),
      query: z
        .union([z.string(), z.object({}).passthrough()])
        .optional()
        .describe('Query (ES-QL string or Elasticsearch Query DSL)'),
      aggs: z.object({}).passthrough().optional().describe('Aggregations'),
      aggregations: z.object({}).passthrough().optional().describe('Aggregations'),
      post_filter: z.object({}).passthrough().optional().describe('Post filter'),
      highlight: z.object({}).passthrough().optional().describe('Highlighting configuration'),
      fields: z.array(z.string()).optional().describe('Fields to return'),
    }),
    outputSchema: z.any().describe('Response from search API'),
  },
  {
    type: 'elasticsearch.search_application.delete',
    connectorIdRequired: false,
    description: 'DELETE _application/search_application/{name} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_application/search_application/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-delete',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from search_application.delete API'),
  },
  {
    type: 'elasticsearch.search_application.delete_behavioral_analytics',
    connectorIdRequired: false,
    description: 'DELETE _application/analytics/{name} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_application/analytics/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-delete-behavioral-analytics',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z
      .any()
      .describe('Response from search_application.delete_behavioral_analytics API'),
  },
  {
    type: 'elasticsearch.search_application.get',
    connectorIdRequired: false,
    description: 'GET _application/search_application/{name} - 4 parameters',
    methods: ['GET'],
    patterns: ['_application/search_application/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-get',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from search_application.get API'),
  },
  {
    type: 'elasticsearch.search_application.get_behavioral_analytics',
    connectorIdRequired: false,
    description: 'GET _application/analytics | _application/analytics/{name} - 4 parameters',
    methods: ['GET'],
    patterns: ['_application/analytics', '_application/analytics/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-get-behavioral-analytics',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from search_application.get_behavioral_analytics API'),
  },
  {
    type: 'elasticsearch.search_application.list',
    connectorIdRequired: false,
    description: 'GET _application/search_application - 7 parameters',
    methods: ['GET'],
    patterns: ['_application/search_application'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-get-behavioral-analytics',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'q', 'from', 'size'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      q: z.union([z.string(), z.number()]).optional().describe('Parameter: q'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      size: z.union([z.string(), z.number()]).optional().describe('Parameter: size'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from search_application.list API'),
  },
  {
    type: 'elasticsearch.search_application.post_behavioral_analytics_event',
    connectorIdRequired: false,
    description: 'POST _application/analytics/{collection_name}/event/{event_type} - 5 parameters',
    methods: ['POST'],
    patterns: ['_application/analytics/{collection_name}/event/{event_type}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-post-behavioral-analytics-event',
    parameterTypes: {
      pathParams: ['collection_name', 'event_type'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'debug'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      collection_name: z.string().describe('Path parameter: collection_name (required)'),
      event_type: z.string().describe('Path parameter: event_type (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      debug: z.boolean().optional().describe('Boolean flag: debug'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z
      .any()
      .describe('Response from search_application.post_behavioral_analytics_event API'),
  },
  {
    type: 'elasticsearch.search_application.put',
    connectorIdRequired: false,
    description: 'PUT _application/search_application/{name} - 5 parameters',
    methods: ['PUT'],
    patterns: ['_application/search_application/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-put',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'create'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      create: z.boolean().optional().describe('Boolean flag: create'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from search_application.put API'),
  },
  {
    type: 'elasticsearch.search_application.put_behavioral_analytics',
    connectorIdRequired: false,
    description: 'PUT _application/analytics/{name} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_application/analytics/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-put-behavioral-analytics',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from search_application.put_behavioral_analytics API'),
  },
  {
    type: 'elasticsearch.search_application.render_query',
    connectorIdRequired: false,
    description: 'POST _application/search_application/{name}/_render_query - 4 parameters',
    methods: ['POST'],
    patterns: ['_application/search_application/{name}/_render_query'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-render-query',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from search_application.render_query API'),
  },
  {
    type: 'elasticsearch.search_application.search',
    connectorIdRequired: false,
    description: 'GET/POST _application/search_application/{name}/_search - 5 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_application/search_application/{name}/_search'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-search',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'typed_keys'],
      bodyParams: [
        'query',
        'size',
        'from',
        'sort',
        'aggs',
        'aggregations',
        'post_filter',
        'highlight',
        '_source',
        'fields',
        'track_total_hits',
      ],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      typed_keys: z.boolean().optional().describe('Boolean flag: typed_keys'),
      query: z
        .union([z.string(), z.object({}).passthrough()])
        .optional()
        .describe('Query (ES-QL string or Elasticsearch Query DSL)'),
      size: z.number().optional().describe('Number of results to return'),
      from: z.number().optional().describe('Starting offset'),
      sort: z
        .union([z.array(z.any()), z.object({}).passthrough()])
        .optional()
        .describe('Sort specification'),
      aggs: z.object({}).passthrough().optional().describe('Aggregations'),
      aggregations: z.object({}).passthrough().optional().describe('Aggregations'),
      post_filter: z.object({}).passthrough().optional().describe('Post filter'),
      highlight: z.object({}).passthrough().optional().describe('Highlighting configuration'),
      _source: z
        .union([z.boolean(), z.array(z.string()), z.object({}).passthrough()])
        .optional()
        .describe('Source field filtering'),
      fields: z.array(z.string()).optional().describe('Fields to return'),
      track_total_hits: z.union([z.boolean(), z.number()]).optional().describe('Track total hits'),
    }),
    outputSchema: z.any().describe('Response from search_application.search API'),
  },
  {
    type: 'elasticsearch.search_mvt',
    connectorIdRequired: false,
    description: 'POST/GET {index}/_mvt/{field}/{zoom}/{x}/{y} - 11 parameters',
    methods: ['POST', 'GET'],
    patterns: ['{index}/_mvt/{field}/{zoom}/{x}/{y}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-mvt',
    parameterTypes: {
      pathParams: ['index', 'field', 'zoom', 'x', 'y'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'exact_bounds',
        'extent',
        'grid_agg',
        'grid_precision',
        'grid_type',
        'size',
        'with_labels',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      field: z.string().describe('Path parameter: field (required)'),
      zoom: z.string().describe('Path parameter: zoom (required)'),
      x: z.string().describe('Path parameter: x (required)'),
      y: z.string().describe('Path parameter: y (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      exact_bounds: z.boolean().optional().describe('Boolean flag: exact_bounds'),
      extent: z
        .union([z.number(), z.array(z.number()), z.enum(['4096'])])
        .optional()
        .describe('Numeric parameter: extent'),
      grid_agg: z.enum(['geotile', 'geohex']).optional().describe('Enum parameter: grid_agg'),
      grid_precision: z
        .union([z.number(), z.array(z.number()), z.enum(['8'])])
        .optional()
        .describe('Numeric parameter: grid_precision'),
      grid_type: z
        .enum(['grid', 'point', 'centroid'])
        .optional()
        .describe('Enum parameter: grid_type'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['10000'])])
        .optional()
        .describe('Numeric parameter: size'),
      with_labels: z.boolean().optional().describe('Boolean flag: with_labels'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from search_mvt API'),
  },
  {
    type: 'elasticsearch.search_shards',
    connectorIdRequired: false,
    description: 'GET/POST _search_shards | {index}/_search_shards - 11 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_search_shards', '{index}/_search_shards'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-shards',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'expand_wildcards',
        'ignore_unavailable',
        'local',
        'master_timeout',
        'preference',
        'routing',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      preference: z.union([z.string(), z.number()]).optional().describe('Parameter: preference'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from search_shards API'),
  },
  {
    type: 'elasticsearch.search_template',
    connectorIdRequired: false,
    description: 'GET/POST _search/template | {index}/_search/template - 17 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_search/template', '{index}/_search/template'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-template',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'ccs_minimize_roundtrips',
        'expand_wildcards',
        'explain',
        'ignore_throttled',
        'ignore_unavailable',
        'preference',
        'profile',
        'routing',
        'scroll',
        'search_type',
        'rest_total_hits_as_int',
        'typed_keys',
      ],
      bodyParams: ['template', 'params', 'explain', 'profile'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      ccs_minimize_roundtrips: z
        .boolean()
        .optional()
        .describe('Boolean flag: ccs_minimize_roundtrips'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      explain: z.boolean().optional().describe('Boolean flag: explain'),
      ignore_throttled: z.boolean().optional().describe('Boolean flag: ignore_throttled'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      preference: z.union([z.string(), z.number()]).optional().describe('Parameter: preference'),
      profile: z.boolean().optional().describe('Boolean flag: profile'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      scroll: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: scroll'),
      search_type: z
        .enum(['query_then_fetch', 'dfs_query_then_fetch'])
        .optional()
        .describe('Enum parameter: search_type'),
      rest_total_hits_as_int: z
        .boolean()
        .optional()
        .describe('Boolean flag: rest_total_hits_as_int'),
      typed_keys: z.boolean().optional().describe('Boolean flag: typed_keys'),
      template: z.object({}).passthrough().optional().describe('Template configuration'),
      params: z.array(z.any()).optional().describe('Query parameters'),
    }),
    outputSchema: z.any().describe('Response from search_template API'),
  },
  {
    type: 'elasticsearch.searchable_snapshots.cache_stats',
    connectorIdRequired: false,
    description:
      'GET _searchable_snapshots/cache/stats | _searchable_snapshots/{node_id}/cache/stats - 5 parameters',
    methods: ['GET'],
    patterns: ['_searchable_snapshots/cache/stats', '_searchable_snapshots/{node_id}/cache/stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-searchable-snapshots-cache-stats',
    parameterTypes: {
      pathParams: ['node_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      node_id: z.string().describe('Path parameter: node_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from searchable_snapshots.cache_stats API'),
  },
  {
    type: 'elasticsearch.searchable_snapshots.clear_cache',
    connectorIdRequired: false,
    description:
      'POST _searchable_snapshots/cache/clear | {index}/_searchable_snapshots/cache/clear - 7 parameters',
    methods: ['POST'],
    patterns: ['_searchable_snapshots/cache/clear', '{index}/_searchable_snapshots/cache/clear'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-searchable-snapshots-clear-cache',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'expand_wildcards',
        'allow_no_indices',
        'ignore_unavailable',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from searchable_snapshots.clear_cache API'),
  },
  {
    type: 'elasticsearch.searchable_snapshots.mount',
    connectorIdRequired: false,
    description: 'POST _snapshot/{repository}/{snapshot}/_mount - 7 parameters',
    methods: ['POST'],
    patterns: ['_snapshot/{repository}/{snapshot}/_mount'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-searchable-snapshots-mount',
    parameterTypes: {
      pathParams: ['repository', 'snapshot'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'master_timeout',
        'wait_for_completion',
        'storage',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      repository: z.string().describe('Path parameter: repository (required)'),
      snapshot: z.string().describe('Path parameter: snapshot (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      wait_for_completion: z.boolean().optional().describe('Boolean flag: wait_for_completion'),
      storage: z.enum(['full_copy']).optional().describe('Enum parameter: storage'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from searchable_snapshots.mount API'),
  },
  {
    type: 'elasticsearch.searchable_snapshots.stats',
    connectorIdRequired: false,
    description:
      'GET _searchable_snapshots/stats | {index}/_searchable_snapshots/stats - 5 parameters',
    methods: ['GET'],
    patterns: ['_searchable_snapshots/stats', '{index}/_searchable_snapshots/stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-searchable-snapshots-stats',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'level'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      level: z.enum(['cluster', 'indices', 'shards']).optional().describe('Enum parameter: level'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from searchable_snapshots.stats API'),
  },
  {
    type: 'elasticsearch.security.activate_user_profile',
    connectorIdRequired: false,
    description: 'POST _security/profile/_activate - 4 parameters',
    methods: ['POST'],
    patterns: ['_security/profile/_activate'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-activate-user-profile',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.activate_user_profile API'),
  },
  {
    type: 'elasticsearch.security.authenticate',
    connectorIdRequired: false,
    description: 'GET _security/_authenticate - 4 parameters',
    methods: ['GET'],
    patterns: ['_security/_authenticate'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-authenticate',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.authenticate API'),
  },
  {
    type: 'elasticsearch.security.bulk_delete_role',
    connectorIdRequired: false,
    description: 'DELETE _security/role - 5 parameters',
    methods: ['DELETE'],
    patterns: ['_security/role'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-bulk-delete-role',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['operations'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      operations: z.array(z.object({}).passthrough()).optional().describe('Bulk operations'),
    }),
    outputSchema: z.any().describe('Response from security.bulk_delete_role API'),
  },
  {
    type: 'elasticsearch.security.bulk_put_role',
    connectorIdRequired: false,
    description: 'POST _security/role - 5 parameters',
    methods: ['POST'],
    patterns: ['_security/role'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-bulk-put-role',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['operations'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      operations: z.array(z.object({}).passthrough()).optional().describe('Bulk operations'),
    }),
    outputSchema: z.any().describe('Response from security.bulk_put_role API'),
  },
  {
    type: 'elasticsearch.security.bulk_update_api_keys',
    connectorIdRequired: false,
    description: 'POST _security/api_key/_bulk_update - 4 parameters',
    methods: ['POST'],
    patterns: ['_security/api_key/_bulk_update'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-bulk-update-api-keys',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['operations'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      operations: z.array(z.object({}).passthrough()).optional().describe('Bulk operations'),
    }),
    outputSchema: z.any().describe('Response from security.bulk_update_api_keys API'),
  },
  {
    type: 'elasticsearch.security.change_password',
    connectorIdRequired: false,
    description:
      'PUT/POST _security/user/{username}/_password | _security/user/_password - 5 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_security/user/{username}/_password', '_security/user/_password'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-change-password',
    parameterTypes: {
      pathParams: ['username'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      username: z.string().describe('Path parameter: username (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.change_password API'),
  },
  {
    type: 'elasticsearch.security.clear_api_key_cache',
    connectorIdRequired: false,
    description: 'POST _security/api_key/{ids}/_clear_cache - 4 parameters',
    methods: ['POST'],
    patterns: ['_security/api_key/{ids}/_clear_cache'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-clear-api-key-cache',
    parameterTypes: {
      pathParams: ['ids'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      ids: z.string().describe('Path parameter: ids (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.clear_api_key_cache API'),
  },
  {
    type: 'elasticsearch.security.clear_cached_privileges',
    connectorIdRequired: false,
    description: 'POST _security/privilege/{application}/_clear_cache - 4 parameters',
    methods: ['POST'],
    patterns: ['_security/privilege/{application}/_clear_cache'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-clear-cached-privileges',
    parameterTypes: {
      pathParams: ['application'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      application: z.string().describe('Path parameter: application (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.clear_cached_privileges API'),
  },
  {
    type: 'elasticsearch.security.clear_cached_realms',
    connectorIdRequired: false,
    description: 'POST _security/realm/{realms}/_clear_cache - 5 parameters',
    methods: ['POST'],
    patterns: ['_security/realm/{realms}/_clear_cache'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-clear-cached-realms',
    parameterTypes: {
      pathParams: ['realms'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'usernames'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      realms: z.string().describe('Path parameter: realms (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      usernames: z.union([z.string(), z.number()]).optional().describe('Parameter: usernames'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.clear_cached_realms API'),
  },
  {
    type: 'elasticsearch.security.clear_cached_roles',
    connectorIdRequired: false,
    description: 'POST _security/role/{name}/_clear_cache - 4 parameters',
    methods: ['POST'],
    patterns: ['_security/role/{name}/_clear_cache'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-clear-cached-roles',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.clear_cached_roles API'),
  },
  {
    type: 'elasticsearch.security.clear_cached_service_tokens',
    connectorIdRequired: false,
    description:
      'POST _security/service/{namespace}/{service}/credential/token/{name}/_clear_cache - 4 parameters',
    methods: ['POST'],
    patterns: ['_security/service/{namespace}/{service}/credential/token/{name}/_clear_cache'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-clear-cached-service-tokens',
    parameterTypes: {
      pathParams: ['namespace', 'service', 'name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      namespace: z.string().describe('Path parameter: namespace (required)'),
      service: z.string().describe('Path parameter: service (required)'),
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.clear_cached_service_tokens API'),
  },
  {
    type: 'elasticsearch.security.create_api_key',
    connectorIdRequired: false,
    description: 'PUT/POST _security/api_key - 5 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_security/api_key'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-api-key',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['document'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      document: z.object({}).passthrough().optional().describe('Document content'),
    }),
    outputSchema: z.any().describe('Response from security.create_api_key API'),
  },
  {
    type: 'elasticsearch.security.create_cross_cluster_api_key',
    connectorIdRequired: false,
    description: 'POST _security/cross_cluster/api_key - 4 parameters',
    methods: ['POST'],
    patterns: ['_security/cross_cluster/api_key'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-cross-cluster-api-key',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['document'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      document: z.object({}).passthrough().optional().describe('Document content'),
    }),
    outputSchema: z.any().describe('Response from security.create_cross_cluster_api_key API'),
  },
  {
    type: 'elasticsearch.security.create_service_token',
    connectorIdRequired: false,
    description:
      'PUT/POST _security/service/{namespace}/{service}/credential/token/{name} | _security/service/{namespace}/{service}/credential/token - 5 parameters',
    methods: ['PUT', 'POST'],
    patterns: [
      '_security/service/{namespace}/{service}/credential/token/{name}',
      '_security/service/{namespace}/{service}/credential/token',
    ],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-service-token',
    parameterTypes: {
      pathParams: ['namespace', 'service', 'name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['document'],
    },
    paramsSchema: z.object({
      namespace: z.string().describe('Path parameter: namespace (required)'),
      service: z.string().describe('Path parameter: service (required)'),
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      document: z.object({}).passthrough().optional().describe('Document content'),
    }),
    outputSchema: z.any().describe('Response from security.create_service_token API'),
  },
  {
    type: 'elasticsearch.security.delegate_pki',
    connectorIdRequired: false,
    description: 'POST _security/delegate_pki - 4 parameters',
    methods: ['POST'],
    patterns: ['_security/delegate_pki'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delegate-pki',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.delegate_pki API'),
  },
  {
    type: 'elasticsearch.security.delete_privileges',
    connectorIdRequired: false,
    description: 'DELETE _security/privilege/{application}/{name} - 5 parameters',
    methods: ['DELETE'],
    patterns: ['_security/privilege/{application}/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delete-privileges',
    parameterTypes: {
      pathParams: ['application', 'name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      application: z.string().describe('Path parameter: application (required)'),
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.delete_privileges API'),
  },
  {
    type: 'elasticsearch.security.delete_role',
    connectorIdRequired: false,
    description: 'DELETE _security/role/{name} - 5 parameters',
    methods: ['DELETE'],
    patterns: ['_security/role/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delete-role',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.delete_role API'),
  },
  {
    type: 'elasticsearch.security.delete_role_mapping',
    connectorIdRequired: false,
    description: 'DELETE _security/role_mapping/{name} - 5 parameters',
    methods: ['DELETE'],
    patterns: ['_security/role_mapping/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delete-role-mapping',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.delete_role_mapping API'),
  },
  {
    type: 'elasticsearch.security.delete_service_token',
    connectorIdRequired: false,
    description:
      'DELETE _security/service/{namespace}/{service}/credential/token/{name} - 5 parameters',
    methods: ['DELETE'],
    patterns: ['_security/service/{namespace}/{service}/credential/token/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delete-service-token',
    parameterTypes: {
      pathParams: ['namespace', 'service', 'name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      namespace: z.string().describe('Path parameter: namespace (required)'),
      service: z.string().describe('Path parameter: service (required)'),
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.delete_service_token API'),
  },
  {
    type: 'elasticsearch.security.delete_user',
    connectorIdRequired: false,
    description: 'DELETE _security/user/{username} - 5 parameters',
    methods: ['DELETE'],
    patterns: ['_security/user/{username}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delete-user',
    parameterTypes: {
      pathParams: ['username'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      username: z.string().describe('Path parameter: username (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.delete_user API'),
  },
  {
    type: 'elasticsearch.security.disable_user',
    connectorIdRequired: false,
    description: 'PUT/POST _security/user/{username}/_disable - 5 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_security/user/{username}/_disable'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-disable-user',
    parameterTypes: {
      pathParams: ['username'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      username: z.string().describe('Path parameter: username (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.disable_user API'),
  },
  {
    type: 'elasticsearch.security.disable_user_profile',
    connectorIdRequired: false,
    description: 'PUT/POST _security/profile/{uid}/_disable - 5 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_security/profile/{uid}/_disable'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-disable-user-profile',
    parameterTypes: {
      pathParams: ['uid'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      uid: z.string().describe('Path parameter: uid (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.disable_user_profile API'),
  },
  {
    type: 'elasticsearch.security.enable_user',
    connectorIdRequired: false,
    description: 'PUT/POST _security/user/{username}/_enable - 5 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_security/user/{username}/_enable'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-enable-user',
    parameterTypes: {
      pathParams: ['username'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      username: z.string().describe('Path parameter: username (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.enable_user API'),
  },
  {
    type: 'elasticsearch.security.enable_user_profile',
    connectorIdRequired: false,
    description: 'PUT/POST _security/profile/{uid}/_enable - 5 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_security/profile/{uid}/_enable'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-enable-user-profile',
    parameterTypes: {
      pathParams: ['uid'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      uid: z.string().describe('Path parameter: uid (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.enable_user_profile API'),
  },
  {
    type: 'elasticsearch.security.enroll_kibana',
    connectorIdRequired: false,
    description: 'GET _security/enroll/kibana - 4 parameters',
    methods: ['GET'],
    patterns: ['_security/enroll/kibana'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-enroll-kibana',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.enroll_kibana API'),
  },
  {
    type: 'elasticsearch.security.enroll_node',
    connectorIdRequired: false,
    description: 'GET _security/enroll/node - 4 parameters',
    methods: ['GET'],
    patterns: ['_security/enroll/node'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-enroll-node',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.enroll_node API'),
  },
  {
    type: 'elasticsearch.security.get_api_key',
    connectorIdRequired: false,
    description: 'GET _security/api_key - 12 parameters',
    methods: ['GET'],
    patterns: ['_security/api_key'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-api-key',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'id',
        'name',
        'owner',
        'realm_name',
        'username',
        'with_limited_by',
        'active_only',
        'with_profile_uid',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      id: z.union([z.string(), z.number()]).optional().describe('Parameter: id'),
      name: z.union([z.string(), z.number()]).optional().describe('Parameter: name'),
      owner: z.boolean().optional().describe('Boolean flag: owner'),
      realm_name: z.union([z.string(), z.number()]).optional().describe('Parameter: realm_name'),
      username: z.union([z.string(), z.number()]).optional().describe('Parameter: username'),
      with_limited_by: z.boolean().optional().describe('Boolean flag: with_limited_by'),
      active_only: z.boolean().optional().describe('Boolean flag: active_only'),
      with_profile_uid: z.boolean().optional().describe('Boolean flag: with_profile_uid'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.get_api_key API'),
  },
  {
    type: 'elasticsearch.security.get_builtin_privileges',
    connectorIdRequired: false,
    description: 'GET _security/privilege/_builtin - 4 parameters',
    methods: ['GET'],
    patterns: ['_security/privilege/_builtin'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-builtin-privileges',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.get_builtin_privileges API'),
  },
  {
    type: 'elasticsearch.security.get_privileges',
    connectorIdRequired: false,
    description:
      'GET _security/privilege | _security/privilege/{application} | _security/privilege/{application}/{name} - 4 parameters',
    methods: ['GET'],
    patterns: [
      '_security/privilege',
      '_security/privilege/{application}',
      '_security/privilege/{application}/{name}',
    ],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-privileges',
    parameterTypes: {
      pathParams: ['application', 'name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      application: z.string().describe('Path parameter: application (required)'),
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.get_privileges API'),
  },
  {
    type: 'elasticsearch.security.get_role',
    connectorIdRequired: false,
    description: 'GET _security/role/{name} | _security/role - 4 parameters',
    methods: ['GET'],
    patterns: ['_security/role/{name}', '_security/role'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-role',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.get_role API'),
  },
  {
    type: 'elasticsearch.security.get_role_mapping',
    connectorIdRequired: false,
    description: 'GET _security/role_mapping/{name} | _security/role_mapping - 4 parameters',
    methods: ['GET'],
    patterns: ['_security/role_mapping/{name}', '_security/role_mapping'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-role-mapping',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.get_role_mapping API'),
  },
  {
    type: 'elasticsearch.security.get_service_accounts',
    connectorIdRequired: false,
    description:
      'GET _security/service/{namespace}/{service} | _security/service/{namespace} | _security/service - 4 parameters',
    methods: ['GET'],
    patterns: [
      '_security/service/{namespace}/{service}',
      '_security/service/{namespace}',
      '_security/service',
    ],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-service-accounts',
    parameterTypes: {
      pathParams: ['namespace', 'service'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      namespace: z.string().describe('Path parameter: namespace (required)'),
      service: z.string().describe('Path parameter: service (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.get_service_accounts API'),
  },
  {
    type: 'elasticsearch.security.get_service_credentials',
    connectorIdRequired: false,
    description: 'GET _security/service/{namespace}/{service}/credential - 4 parameters',
    methods: ['GET'],
    patterns: ['_security/service/{namespace}/{service}/credential'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-service-credentials',
    parameterTypes: {
      pathParams: ['namespace', 'service'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      namespace: z.string().describe('Path parameter: namespace (required)'),
      service: z.string().describe('Path parameter: service (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.get_service_credentials API'),
  },
  {
    type: 'elasticsearch.security.get_settings',
    connectorIdRequired: false,
    description: 'GET _security/settings - 5 parameters',
    methods: ['GET'],
    patterns: ['_security/settings'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-settings',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.get_settings API'),
  },
  {
    type: 'elasticsearch.security.get_token',
    connectorIdRequired: false,
    description: 'POST _security/oauth2/token - 4 parameters',
    methods: ['POST'],
    patterns: ['_security/oauth2/token'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-token',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.get_token API'),
  },
  {
    type: 'elasticsearch.security.get_user',
    connectorIdRequired: false,
    description: 'GET _security/user/{username} | _security/user - 5 parameters',
    methods: ['GET'],
    patterns: ['_security/user/{username}', '_security/user'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-user',
    parameterTypes: {
      pathParams: ['username'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'with_profile_uid'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      username: z.string().describe('Path parameter: username (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      with_profile_uid: z.boolean().optional().describe('Boolean flag: with_profile_uid'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.get_user API'),
  },
  {
    type: 'elasticsearch.security.get_user_privileges',
    connectorIdRequired: false,
    description: 'GET _security/user/_privileges - 7 parameters',
    methods: ['GET'],
    patterns: ['_security/user/_privileges'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-user-privileges',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'application',
        'priviledge',
        'username',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      application: z.union([z.string(), z.number()]).optional().describe('Parameter: application'),
      priviledge: z.union([z.string(), z.number()]).optional().describe('Parameter: priviledge'),
      username: z.array(z.string()).optional().describe('Array parameter: username'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.get_user_privileges API'),
  },
  {
    type: 'elasticsearch.security.get_user_profile',
    connectorIdRequired: false,
    description: 'GET _security/profile/{uid} - 5 parameters',
    methods: ['GET'],
    patterns: ['_security/profile/{uid}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-user-profile',
    parameterTypes: {
      pathParams: ['uid'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'data'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      uid: z.string().describe('Path parameter: uid (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      data: z.array(z.string()).optional().describe('Array parameter: data'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.get_user_profile API'),
  },
  {
    type: 'elasticsearch.security.grant_api_key',
    connectorIdRequired: false,
    description: 'POST _security/api_key/grant - 4 parameters',
    methods: ['POST'],
    patterns: ['_security/api_key/grant'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-grant-api-key',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.grant_api_key API'),
  },
  {
    type: 'elasticsearch.security.has_privileges',
    connectorIdRequired: false,
    description:
      'GET/POST _security/user/_has_privileges | _security/user/{user}/_has_privileges - 4 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_security/user/_has_privileges', '_security/user/{user}/_has_privileges'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-has-privileges',
    parameterTypes: {
      pathParams: ['user'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      user: z.string().describe('Path parameter: user (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.has_privileges API'),
  },
  {
    type: 'elasticsearch.security.has_privileges_user_profile',
    connectorIdRequired: false,
    description: 'GET/POST _security/profile/_has_privileges - 4 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_security/profile/_has_privileges'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-has-privileges-user-profile',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.has_privileges_user_profile API'),
  },
  {
    type: 'elasticsearch.security.invalidate_api_key',
    connectorIdRequired: false,
    description: 'DELETE _security/api_key - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_security/api_key'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-invalidate-api-key',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.invalidate_api_key API'),
  },
  {
    type: 'elasticsearch.security.invalidate_token',
    connectorIdRequired: false,
    description: 'DELETE _security/oauth2/token - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_security/oauth2/token'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-invalidate-token',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.invalidate_token API'),
  },
  {
    type: 'elasticsearch.security.oidc_authenticate',
    connectorIdRequired: false,
    description: 'POST _security/oidc/authenticate - 4 parameters',
    methods: ['POST'],
    patterns: ['_security/oidc/authenticate'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-oidc-authenticate',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.oidc_authenticate API'),
  },
  {
    type: 'elasticsearch.security.oidc_logout',
    connectorIdRequired: false,
    description: 'POST _security/oidc/logout - 4 parameters',
    methods: ['POST'],
    patterns: ['_security/oidc/logout'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-oidc-logout',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.oidc_logout API'),
  },
  {
    type: 'elasticsearch.security.oidc_prepare_authentication',
    connectorIdRequired: false,
    description: 'POST _security/oidc/prepare - 4 parameters',
    methods: ['POST'],
    patterns: ['_security/oidc/prepare'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-oidc-prepare-authentication',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.oidc_prepare_authentication API'),
  },
  {
    type: 'elasticsearch.security.put_privileges',
    connectorIdRequired: false,
    description: 'PUT/POST _security/privilege - 5 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_security/privilege'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-privileges',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.put_privileges API'),
  },
  {
    type: 'elasticsearch.security.put_role',
    connectorIdRequired: false,
    description: 'PUT/POST _security/role/{name} - 5 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_security/role/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-role',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['cluster', 'indices', 'applications', 'run_as', 'metadata'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      cluster: z.array(z.string()).optional().describe('Cluster privileges'),
      indices: z.array(z.object({}).passthrough()).optional().describe('Index privileges'),
      applications: z
        .array(z.object({}).passthrough())
        .optional()
        .describe('Application privileges'),
      run_as: z.array(z.string()).optional().describe('Run as users'),
      metadata: z.object({}).passthrough().optional().describe('Metadata'),
    }),
    outputSchema: z.any().describe('Response from security.put_role API'),
  },
  {
    type: 'elasticsearch.security.put_role_mapping',
    connectorIdRequired: false,
    description: 'PUT/POST _security/role_mapping/{name} - 5 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_security/role_mapping/{name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-role-mapping',
    parameterTypes: {
      pathParams: ['name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['cluster', 'indices', 'applications', 'run_as', 'metadata'],
    },
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      cluster: z.array(z.string()).optional().describe('Cluster privileges'),
      indices: z.array(z.object({}).passthrough()).optional().describe('Index privileges'),
      applications: z
        .array(z.object({}).passthrough())
        .optional()
        .describe('Application privileges'),
      run_as: z.array(z.string()).optional().describe('Run as users'),
      metadata: z.object({}).passthrough().optional().describe('Metadata'),
    }),
    outputSchema: z.any().describe('Response from security.put_role_mapping API'),
  },
  {
    type: 'elasticsearch.security.put_user',
    connectorIdRequired: false,
    description: 'PUT/POST _security/user/{username} - 5 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_security/user/{username}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-user',
    parameterTypes: {
      pathParams: ['username'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['password', 'roles', 'full_name', 'email', 'metadata'],
    },
    paramsSchema: z.object({
      username: z.string().describe('Path parameter: username (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      password: z.string().optional().describe('User password'),
      roles: z.array(z.string()).optional().describe('User roles'),
      full_name: z.string().optional().describe('Full name'),
      email: z.string().optional().describe('Email address'),
      metadata: z.object({}).passthrough().optional().describe('Metadata'),
    }),
    outputSchema: z.any().describe('Response from security.put_user API'),
  },
  {
    type: 'elasticsearch.security.query_api_keys',
    connectorIdRequired: false,
    description: 'GET/POST _security/_query/api_key - 7 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_security/_query/api_key'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-query-api-keys',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'with_limited_by',
        'with_profile_uid',
        'typed_keys',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      with_limited_by: z.boolean().optional().describe('Boolean flag: with_limited_by'),
      with_profile_uid: z.boolean().optional().describe('Boolean flag: with_profile_uid'),
      typed_keys: z.boolean().optional().describe('Boolean flag: typed_keys'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.query_api_keys API'),
  },
  {
    type: 'elasticsearch.security.query_role',
    connectorIdRequired: false,
    description: 'GET/POST _security/_query/role - 4 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_security/_query/role'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-query-role',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.query_role API'),
  },
  {
    type: 'elasticsearch.security.query_user',
    connectorIdRequired: false,
    description: 'GET/POST _security/_query/user - 5 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_security/_query/user'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-query-user',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'with_profile_uid'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      with_profile_uid: z.boolean().optional().describe('Boolean flag: with_profile_uid'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.query_user API'),
  },
  {
    type: 'elasticsearch.security.saml_authenticate',
    connectorIdRequired: false,
    description: 'POST _security/saml/authenticate - 4 parameters',
    methods: ['POST'],
    patterns: ['_security/saml/authenticate'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-authenticate',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.saml_authenticate API'),
  },
  {
    type: 'elasticsearch.security.saml_complete_logout',
    connectorIdRequired: false,
    description: 'POST _security/saml/complete_logout - 4 parameters',
    methods: ['POST'],
    patterns: ['_security/saml/complete_logout'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-complete-logout',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.saml_complete_logout API'),
  },
  {
    type: 'elasticsearch.security.saml_invalidate',
    connectorIdRequired: false,
    description: 'POST _security/saml/invalidate - 4 parameters',
    methods: ['POST'],
    patterns: ['_security/saml/invalidate'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-invalidate',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.saml_invalidate API'),
  },
  {
    type: 'elasticsearch.security.saml_logout',
    connectorIdRequired: false,
    description: 'POST _security/saml/logout - 4 parameters',
    methods: ['POST'],
    patterns: ['_security/saml/logout'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-logout',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.saml_logout API'),
  },
  {
    type: 'elasticsearch.security.saml_prepare_authentication',
    connectorIdRequired: false,
    description: 'POST _security/saml/prepare - 4 parameters',
    methods: ['POST'],
    patterns: ['_security/saml/prepare'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-prepare-authentication',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.saml_prepare_authentication API'),
  },
  {
    type: 'elasticsearch.security.saml_service_provider_metadata',
    connectorIdRequired: false,
    description: 'GET _security/saml/metadata/{realm_name} - 4 parameters',
    methods: ['GET'],
    patterns: ['_security/saml/metadata/{realm_name}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-saml-service-provider-metadata',
    parameterTypes: {
      pathParams: ['realm_name'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      realm_name: z.string().describe('Path parameter: realm_name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.saml_service_provider_metadata API'),
  },
  {
    type: 'elasticsearch.security.suggest_user_profiles',
    connectorIdRequired: false,
    description: 'GET/POST _security/profile/_suggest - 5 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_security/profile/_suggest'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-suggest-user-profiles',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'data'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      data: z.array(z.string()).optional().describe('Array parameter: data'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.suggest_user_profiles API'),
  },
  {
    type: 'elasticsearch.security.update_api_key',
    connectorIdRequired: false,
    description: 'PUT _security/api_key/{id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_security/api_key/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-update-api-key',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from security.update_api_key API'),
  },
  {
    type: 'elasticsearch.security.update_cross_cluster_api_key',
    connectorIdRequired: false,
    description: 'PUT _security/cross_cluster/api_key/{id} - 4 parameters',
    methods: ['PUT'],
    patterns: ['_security/cross_cluster/api_key/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-update-cross-cluster-api-key',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from security.update_cross_cluster_api_key API'),
  },
  {
    type: 'elasticsearch.security.update_settings',
    connectorIdRequired: false,
    description: 'PUT _security/settings - 6 parameters',
    methods: ['PUT'],
    patterns: ['_security/settings'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-update-settings',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: master_timeout'),
      timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: timeout'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from security.update_settings API'),
  },
  {
    type: 'elasticsearch.security.update_user_profile_data',
    connectorIdRequired: false,
    description: 'PUT/POST _security/profile/{uid}/_data - 7 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_security/profile/{uid}/_data'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-update-user-profile-data',
    parameterTypes: {
      pathParams: ['uid'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'if_seq_no',
        'if_primary_term',
        'refresh',
      ],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      uid: z.string().describe('Path parameter: uid (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      if_seq_no: z.union([z.string(), z.number()]).optional().describe('Parameter: if_seq_no'),
      if_primary_term: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: if_primary_term'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from security.update_user_profile_data API'),
  },
  {
    type: 'elasticsearch.shutdown.delete_node',
    connectorIdRequired: false,
    description: 'DELETE _nodes/{node_id}/shutdown - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_nodes/{node_id}/shutdown'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-shutdown-delete-node',
    parameterTypes: {
      pathParams: ['node_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      node_id: z.string().describe('Path parameter: node_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from shutdown.delete_node API'),
  },
  {
    type: 'elasticsearch.shutdown.get_node',
    connectorIdRequired: false,
    description: 'GET _nodes/shutdown | _nodes/{node_id}/shutdown - 5 parameters',
    methods: ['GET'],
    patterns: ['_nodes/shutdown', '_nodes/{node_id}/shutdown'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-shutdown-get-node',
    parameterTypes: {
      pathParams: ['node_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      node_id: z.string().describe('Path parameter: node_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from shutdown.get_node API'),
  },
  {
    type: 'elasticsearch.shutdown.put_node',
    connectorIdRequired: false,
    description: 'PUT _nodes/{node_id}/shutdown - 6 parameters',
    methods: ['PUT'],
    patterns: ['_nodes/{node_id}/shutdown'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-shutdown-put-node',
    parameterTypes: {
      pathParams: ['node_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      node_id: z.string().describe('Path parameter: node_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z
        .enum(['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'])
        .optional()
        .describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from shutdown.put_node API'),
  },
  {
    type: 'elasticsearch.simulate.ingest',
    connectorIdRequired: false,
    description: 'GET/POST _ingest/_simulate | _ingest/{index}/_simulate - 5 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_ingest/_simulate', '_ingest/{index}/_simulate'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-simulate-ingest',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'pipeline'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      pipeline: z.union([z.string(), z.number()]).optional().describe('Parameter: pipeline'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from simulate.ingest API'),
  },
  {
    type: 'elasticsearch.slm.delete_lifecycle',
    connectorIdRequired: false,
    description: 'DELETE _slm/policy/{policy_id} - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_slm/policy/{policy_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-delete-lifecycle',
    parameterTypes: {
      pathParams: ['policy_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      policy_id: z.string().describe('Path parameter: policy_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from slm.delete_lifecycle API'),
  },
  {
    type: 'elasticsearch.slm.execute_lifecycle',
    connectorIdRequired: false,
    description: 'PUT _slm/policy/{policy_id}/_execute - 6 parameters',
    methods: ['PUT'],
    patterns: ['_slm/policy/{policy_id}/_execute'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-execute-lifecycle',
    parameterTypes: {
      pathParams: ['policy_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      policy_id: z.string().describe('Path parameter: policy_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from slm.execute_lifecycle API'),
  },
  {
    type: 'elasticsearch.slm.execute_retention',
    connectorIdRequired: false,
    description: 'POST _slm/_execute_retention - 6 parameters',
    methods: ['POST'],
    patterns: ['_slm/_execute_retention'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-execute-retention',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from slm.execute_retention API'),
  },
  {
    type: 'elasticsearch.slm.get_lifecycle',
    connectorIdRequired: false,
    description: 'GET _slm/policy/{policy_id} | _slm/policy - 6 parameters',
    methods: ['GET'],
    patterns: ['_slm/policy/{policy_id}', '_slm/policy'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-get-lifecycle',
    parameterTypes: {
      pathParams: ['policy_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      policy_id: z.string().describe('Path parameter: policy_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from slm.get_lifecycle API'),
  },
  {
    type: 'elasticsearch.slm.get_stats',
    connectorIdRequired: false,
    description: 'GET _slm/stats - 6 parameters',
    methods: ['GET'],
    patterns: ['_slm/stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-get-stats',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from slm.get_stats API'),
  },
  {
    type: 'elasticsearch.slm.get_status',
    connectorIdRequired: false,
    description: 'GET _slm/status - 6 parameters',
    methods: ['GET'],
    patterns: ['_slm/status'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-get-status',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from slm.get_status API'),
  },
  {
    type: 'elasticsearch.slm.put_lifecycle',
    connectorIdRequired: false,
    description: 'PUT _slm/policy/{policy_id} - 6 parameters',
    methods: ['PUT'],
    patterns: ['_slm/policy/{policy_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-put-lifecycle',
    parameterTypes: {
      pathParams: ['policy_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      policy_id: z.string().describe('Path parameter: policy_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from slm.put_lifecycle API'),
  },
  {
    type: 'elasticsearch.slm.start',
    connectorIdRequired: false,
    description: 'POST _slm/start - 6 parameters',
    methods: ['POST'],
    patterns: ['_slm/start'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-start',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from slm.start API'),
  },
  {
    type: 'elasticsearch.slm.stop',
    connectorIdRequired: false,
    description: 'POST _slm/stop - 6 parameters',
    methods: ['POST'],
    patterns: ['_slm/stop'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-stop',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from slm.stop API'),
  },
  {
    type: 'elasticsearch.snapshot.cleanup_repository',
    connectorIdRequired: false,
    description: 'POST _snapshot/{repository}/_cleanup - 6 parameters',
    methods: ['POST'],
    patterns: ['_snapshot/{repository}/_cleanup'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-cleanup-repository',
    parameterTypes: {
      pathParams: ['repository'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      repository: z.string().describe('Path parameter: repository (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from snapshot.cleanup_repository API'),
  },
  {
    type: 'elasticsearch.snapshot.clone',
    connectorIdRequired: false,
    description: 'PUT _snapshot/{repository}/{snapshot}/_clone/{target_snapshot} - 5 parameters',
    methods: ['PUT'],
    patterns: ['_snapshot/{repository}/{snapshot}/_clone/{target_snapshot}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-clone',
    parameterTypes: {
      pathParams: ['repository', 'snapshot', 'target_snapshot'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      repository: z.string().describe('Path parameter: repository (required)'),
      snapshot: z.string().describe('Path parameter: snapshot (required)'),
      target_snapshot: z.string().describe('Path parameter: target_snapshot (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from snapshot.clone API'),
  },
  {
    type: 'elasticsearch.snapshot.create',
    connectorIdRequired: false,
    description: 'PUT/POST _snapshot/{repository}/{snapshot} - 6 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_snapshot/{repository}/{snapshot}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-create',
    parameterTypes: {
      pathParams: ['repository', 'snapshot'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'master_timeout',
        'wait_for_completion',
      ],
      bodyParams: ['document'],
    },
    paramsSchema: z.object({
      repository: z.string().describe('Path parameter: repository (required)'),
      snapshot: z.string().describe('Path parameter: snapshot (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      wait_for_completion: z.boolean().optional().describe('Boolean flag: wait_for_completion'),
      document: z.object({}).passthrough().optional().describe('Document content'),
    }),
    outputSchema: z.any().describe('Response from snapshot.create API'),
  },
  {
    type: 'elasticsearch.snapshot.create_repository',
    connectorIdRequired: false,
    description: 'PUT/POST _snapshot/{repository} - 7 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_snapshot/{repository}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-create-repository',
    parameterTypes: {
      pathParams: ['repository'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'master_timeout',
        'timeout',
        'verify',
      ],
      bodyParams: ['document'],
    },
    paramsSchema: z.object({
      repository: z.string().describe('Path parameter: repository (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      verify: z.boolean().optional().describe('Boolean flag: verify'),
      document: z.object({}).passthrough().optional().describe('Document content'),
    }),
    outputSchema: z.any().describe('Response from snapshot.create_repository API'),
  },
  {
    type: 'elasticsearch.snapshot.delete',
    connectorIdRequired: false,
    description: 'DELETE _snapshot/{repository}/{snapshot} - 5 parameters',
    methods: ['DELETE'],
    patterns: ['_snapshot/{repository}/{snapshot}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-delete',
    parameterTypes: {
      pathParams: ['repository', 'snapshot'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      repository: z.string().describe('Path parameter: repository (required)'),
      snapshot: z.string().describe('Path parameter: snapshot (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from snapshot.delete API'),
  },
  {
    type: 'elasticsearch.snapshot.delete_repository',
    connectorIdRequired: false,
    description: 'DELETE _snapshot/{repository} - 6 parameters',
    methods: ['DELETE'],
    patterns: ['_snapshot/{repository}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-delete-repository',
    parameterTypes: {
      pathParams: ['repository'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      repository: z.string().describe('Path parameter: repository (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from snapshot.delete_repository API'),
  },
  {
    type: 'elasticsearch.snapshot.get',
    connectorIdRequired: false,
    description: 'GET _snapshot/{repository}/{snapshot} - 18 parameters',
    methods: ['GET'],
    patterns: ['_snapshot/{repository}/{snapshot}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-get',
    parameterTypes: {
      pathParams: ['repository', 'snapshot'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'after',
        'from_sort_value',
        'ignore_unavailable',
        'index_details',
        'index_names',
        'include_repository',
        'master_timeout',
        'order',
        'offset',
        'size',
        'slm_policy_filter',
        'sort',
        'state',
        'verbose',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      repository: z.string().describe('Path parameter: repository (required)'),
      snapshot: z.string().describe('Path parameter: snapshot (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      after: z.union([z.string(), z.number()]).optional().describe('Parameter: after'),
      from_sort_value: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: from_sort_value'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      index_details: z.boolean().optional().describe('Boolean flag: index_details'),
      index_names: z.boolean().optional().describe('Boolean flag: index_names'),
      include_repository: z.boolean().optional().describe('Boolean flag: include_repository'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      order: z.enum(['asc', 'desc']).optional().describe('Enum parameter: order'),
      offset: z.union([z.string(), z.number()]).optional().describe('Parameter: offset'),
      size: z.union([z.string(), z.number()]).optional().describe('Parameter: size'),
      slm_policy_filter: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: slm_policy_filter'),
      sort: z
        .enum([
          'start_time',
          'duration',
          'name',
          'index_count',
          'repository',
          'shard_count',
          'failed_shard_count',
        ])
        .optional()
        .describe('Enum parameter: sort'),
      state: z
        .enum(['IN_PROGRESS', 'SUCCESS', 'FAILED', 'PARTIAL', 'INCOMPATIBLE'])
        .optional()
        .describe('Enum parameter: state'),
      verbose: z.boolean().optional().describe('Boolean flag: verbose'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from snapshot.get API'),
  },
  {
    type: 'elasticsearch.snapshot.get_repository',
    connectorIdRequired: false,
    description: 'GET _snapshot | _snapshot/{repository} - 6 parameters',
    methods: ['GET'],
    patterns: ['_snapshot', '_snapshot/{repository}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-get-repository',
    parameterTypes: {
      pathParams: ['repository'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'local', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      repository: z.string().describe('Path parameter: repository (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      local: z.boolean().optional().describe('Boolean flag: local'),
      master_timeout: z
        .enum(['to 30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from snapshot.get_repository API'),
  },
  {
    type: 'elasticsearch.snapshot.repository_analyze',
    connectorIdRequired: false,
    description: 'POST _snapshot/{repository}/_analyze - 16 parameters',
    methods: ['POST'],
    patterns: ['_snapshot/{repository}/_analyze'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-repository-analyze',
    parameterTypes: {
      pathParams: ['repository'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'blob_count',
        'concurrency',
        'detailed',
        'early_read_node_count',
        'max_blob_size',
        'max_total_data_size',
        'rare_action_probability',
        'rarely_abort_writes',
        'read_node_count',
        'register_operation_count',
        'seed',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      repository: z.string().describe('Path parameter: repository (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      blob_count: z
        .union([z.number(), z.array(z.number()), z.enum(['100'])])
        .optional()
        .describe('Numeric parameter: blob_count'),
      concurrency: z
        .union([z.number(), z.array(z.number()), z.enum(['10'])])
        .optional()
        .describe('Numeric parameter: concurrency'),
      detailed: z.boolean().optional().describe('Boolean flag: detailed'),
      early_read_node_count: z
        .union([z.number(), z.array(z.number()), z.enum(['2'])])
        .optional()
        .describe('Numeric parameter: early_read_node_count'),
      max_blob_size: z.enum(['10mb']).optional().describe('Enum parameter: max_blob_size'),
      max_total_data_size: z
        .enum(['1gb'])
        .optional()
        .describe('Enum parameter: max_total_data_size'),
      rare_action_probability: z
        .union([z.number(), z.array(z.number()), z.enum(['0.02'])])
        .optional()
        .describe('Numeric parameter: rare_action_probability'),
      rarely_abort_writes: z.boolean().optional().describe('Boolean flag: rarely_abort_writes'),
      read_node_count: z
        .union([z.number(), z.array(z.number()), z.enum(['10'])])
        .optional()
        .describe('Numeric parameter: read_node_count'),
      register_operation_count: z
        .union([z.number(), z.array(z.number()), z.enum(['10'])])
        .optional()
        .describe('Numeric parameter: register_operation_count'),
      seed: z.union([z.string(), z.number()]).optional().describe('Parameter: seed'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from snapshot.repository_analyze API'),
  },
  {
    type: 'elasticsearch.snapshot.repository_verify_integrity',
    connectorIdRequired: false,
    description: 'POST _snapshot/{repository}/_verify_integrity - 12 parameters',
    methods: ['POST'],
    patterns: ['_snapshot/{repository}/_verify_integrity'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-repository-verify-integrity',
    parameterTypes: {
      pathParams: ['repository'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'blob_thread_pool_concurrency',
        'index_snapshot_verification_concurrency',
        'index_verification_concurrency',
        'max_bytes_per_sec',
        'max_failed_shard_snapshots',
        'meta_thread_pool_concurrency',
        'snapshot_verification_concurrency',
        'verify_blob_contents',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      repository: z.string().describe('Path parameter: repository (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      blob_thread_pool_concurrency: z
        .union([z.number(), z.array(z.number()), z.enum(['1'])])
        .optional()
        .describe('Numeric parameter: blob_thread_pool_concurrency'),
      index_snapshot_verification_concurrency: z
        .union([z.number(), z.array(z.number()), z.enum(['1'])])
        .optional()
        .describe('Numeric parameter: index_snapshot_verification_concurrency'),
      index_verification_concurrency: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: index_verification_concurrency'),
      max_bytes_per_sec: z.enum(['10mb']).optional().describe('Enum parameter: max_bytes_per_sec'),
      max_failed_shard_snapshots: z
        .union([z.number(), z.array(z.number()), z.enum(['10000'])])
        .optional()
        .describe('Numeric parameter: max_failed_shard_snapshots'),
      meta_thread_pool_concurrency: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: meta_thread_pool_concurrency'),
      snapshot_verification_concurrency: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: snapshot_verification_concurrency'),
      verify_blob_contents: z.boolean().optional().describe('Boolean flag: verify_blob_contents'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from snapshot.repository_verify_integrity API'),
  },
  {
    type: 'elasticsearch.snapshot.restore',
    connectorIdRequired: false,
    description: 'POST _snapshot/{repository}/{snapshot}/_restore - 6 parameters',
    methods: ['POST'],
    patterns: ['_snapshot/{repository}/{snapshot}/_restore'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-restore',
    parameterTypes: {
      pathParams: ['repository', 'snapshot'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'master_timeout',
        'wait_for_completion',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      repository: z.string().describe('Path parameter: repository (required)'),
      snapshot: z.string().describe('Path parameter: snapshot (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      wait_for_completion: z.boolean().optional().describe('Boolean flag: wait_for_completion'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from snapshot.restore API'),
  },
  {
    type: 'elasticsearch.snapshot.status',
    connectorIdRequired: false,
    description:
      'GET _snapshot/_status | _snapshot/{repository}/_status | _snapshot/{repository}/{snapshot}/_status - 6 parameters',
    methods: ['GET'],
    patterns: [
      '_snapshot/_status',
      '_snapshot/{repository}/_status',
      '_snapshot/{repository}/{snapshot}/_status',
    ],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-status',
    parameterTypes: {
      pathParams: ['repository', 'snapshot'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'ignore_unavailable',
        'master_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      repository: z.string().describe('Path parameter: repository (required)'),
      snapshot: z.string().describe('Path parameter: snapshot (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from snapshot.status API'),
  },
  {
    type: 'elasticsearch.snapshot.verify_repository',
    connectorIdRequired: false,
    description: 'POST _snapshot/{repository}/_verify - 6 parameters',
    methods: ['POST'],
    patterns: ['_snapshot/{repository}/_verify'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-verify-repository',
    parameterTypes: {
      pathParams: ['repository'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      repository: z.string().describe('Path parameter: repository (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from snapshot.verify_repository API'),
  },
  {
    type: 'elasticsearch.sql.clear_cursor',
    connectorIdRequired: false,
    description: 'POST _sql/close - 4 parameters',
    methods: ['POST'],
    patterns: ['_sql/close'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-clear-cursor',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from sql.clear_cursor API'),
  },
  {
    type: 'elasticsearch.sql.delete_async',
    connectorIdRequired: false,
    description: 'DELETE _sql/async/delete/{id} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_sql/async/delete/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-delete-async',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from sql.delete_async API'),
  },
  {
    type: 'elasticsearch.sql.get_async',
    connectorIdRequired: false,
    description: 'GET _sql/async/{id} - 8 parameters',
    methods: ['GET'],
    patterns: ['_sql/async/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-get-async',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'delimiter',
        'format',
        'keep_alive',
        'wait_for_completion_timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      delimiter: z.enum([',']).optional().describe('Enum parameter: delimiter'),
      format: z.union([z.string(), z.number()]).optional().describe('Parameter: format'),
      keep_alive: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: keep_alive'),
      wait_for_completion_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: wait_for_completion_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from sql.get_async API'),
  },
  {
    type: 'elasticsearch.sql.get_async_status',
    connectorIdRequired: false,
    description: 'GET _sql/async/status/{id} - 4 parameters',
    methods: ['GET'],
    patterns: ['_sql/async/status/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-get-async-status',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from sql.get_async_status API'),
  },
  {
    type: 'elasticsearch.sql.query',
    connectorIdRequired: false,
    description: 'POST/GET _sql - 5 parameters',
    methods: ['POST', 'GET'],
    patterns: ['_sql'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-query',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'format'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      format: z
        .enum(['csv', 'json', 'tsv', 'txt', 'yaml', 'cbor', 'smile'])
        .optional()
        .describe('Enum parameter: format'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from sql.query API'),
  },
  {
    type: 'elasticsearch.sql.translate',
    connectorIdRequired: false,
    description: 'POST/GET _sql/translate - 4 parameters',
    methods: ['POST', 'GET'],
    patterns: ['_sql/translate'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-sql-translate',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from sql.translate API'),
  },
  {
    type: 'elasticsearch.ssl.certificates',
    connectorIdRequired: false,
    description: 'GET _ssl/certificates - 4 parameters',
    methods: ['GET'],
    patterns: ['_ssl/certificates'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ssl-certificates',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ssl.certificates API'),
  },
  {
    type: 'elasticsearch.streams.logs_disable',
    connectorIdRequired: false,
    description: 'POST _streams/logs/_disable - 0 parameters',
    methods: ['POST'],
    patterns: ['_streams/logs/_disable'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/streams-logs-disable.html',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from streams.logs_disable API'),
  },
  {
    type: 'elasticsearch.streams.logs_enable',
    connectorIdRequired: false,
    description: 'POST _streams/logs/_enable - 0 parameters',
    methods: ['POST'],
    patterns: ['_streams/logs/_enable'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/streams-logs-enable.html',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from streams.logs_enable API'),
  },
  {
    type: 'elasticsearch.streams.status',
    connectorIdRequired: false,
    description: 'GET _streams/status - 0 parameters',
    methods: ['GET'],
    patterns: ['_streams/status'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/streams-status.html',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from streams.status API'),
  },
  {
    type: 'elasticsearch.synonyms.delete_synonym',
    connectorIdRequired: false,
    description: 'DELETE _synonyms/{id} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_synonyms/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-delete-synonym',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from synonyms.delete_synonym API'),
  },
  {
    type: 'elasticsearch.synonyms.delete_synonym_rule',
    connectorIdRequired: false,
    description: 'DELETE _synonyms/{set_id}/{rule_id} - 5 parameters',
    methods: ['DELETE'],
    patterns: ['_synonyms/{set_id}/{rule_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-delete-synonym-rule',
    parameterTypes: {
      pathParams: ['set_id', 'rule_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      set_id: z.string().describe('Path parameter: set_id (required)'),
      rule_id: z.string().describe('Path parameter: rule_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.boolean().optional().describe('Boolean flag: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from synonyms.delete_synonym_rule API'),
  },
  {
    type: 'elasticsearch.synonyms.get_synonym',
    connectorIdRequired: false,
    description: 'GET _synonyms/{id} - 6 parameters',
    methods: ['GET'],
    patterns: ['_synonyms/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-get-synonym',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'from', 'size'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['10'])])
        .optional()
        .describe('Numeric parameter: size'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from synonyms.get_synonym API'),
  },
  {
    type: 'elasticsearch.synonyms.get_synonym_rule',
    connectorIdRequired: false,
    description: 'GET _synonyms/{set_id}/{rule_id} - 4 parameters',
    methods: ['GET'],
    patterns: ['_synonyms/{set_id}/{rule_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-get-synonym-rule',
    parameterTypes: {
      pathParams: ['set_id', 'rule_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      set_id: z.string().describe('Path parameter: set_id (required)'),
      rule_id: z.string().describe('Path parameter: rule_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from synonyms.get_synonym_rule API'),
  },
  {
    type: 'elasticsearch.synonyms.get_synonyms_sets',
    connectorIdRequired: false,
    description: 'GET _synonyms - 6 parameters',
    methods: ['GET'],
    patterns: ['_synonyms'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-get-synonym',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'from', 'size'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['10'])])
        .optional()
        .describe('Numeric parameter: size'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from synonyms.get_synonyms_sets API'),
  },
  {
    type: 'elasticsearch.synonyms.put_synonym',
    connectorIdRequired: false,
    description: 'PUT _synonyms/{id} - 5 parameters',
    methods: ['PUT'],
    patterns: ['_synonyms/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-put-synonym',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.boolean().optional().describe('Boolean flag: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from synonyms.put_synonym API'),
  },
  {
    type: 'elasticsearch.synonyms.put_synonym_rule',
    connectorIdRequired: false,
    description: 'PUT _synonyms/{set_id}/{rule_id} - 5 parameters',
    methods: ['PUT'],
    patterns: ['_synonyms/{set_id}/{rule_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-put-synonym-rule',
    parameterTypes: {
      pathParams: ['set_id', 'rule_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'refresh'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      set_id: z.string().describe('Path parameter: set_id (required)'),
      rule_id: z.string().describe('Path parameter: rule_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.boolean().optional().describe('Boolean flag: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from synonyms.put_synonym_rule API'),
  },
  {
    type: 'elasticsearch.tasks.cancel',
    connectorIdRequired: false,
    description: 'POST _tasks/_cancel | _tasks/{task_id}/_cancel - 8 parameters',
    methods: ['POST'],
    patterns: ['_tasks/_cancel', '_tasks/{task_id}/_cancel'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-tasks',
    parameterTypes: {
      pathParams: ['task_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'actions',
        'nodes',
        'parent_task_id',
        'wait_for_completion',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_id: z.string().describe('Path parameter: task_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      actions: z.array(z.string()).optional().describe('Array parameter: actions'),
      nodes: z.union([z.string(), z.number()]).optional().describe('Parameter: nodes'),
      parent_task_id: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: parent_task_id'),
      wait_for_completion: z.boolean().optional().describe('Boolean flag: wait_for_completion'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from tasks.cancel API'),
  },
  {
    type: 'elasticsearch.tasks.get',
    connectorIdRequired: false,
    description: 'GET _tasks/{task_id} - 6 parameters',
    methods: ['GET'],
    patterns: ['_tasks/{task_id}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-tasks',
    parameterTypes: {
      pathParams: ['task_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'timeout',
        'wait_for_completion',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      task_id: z.string().describe('Path parameter: task_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      wait_for_completion: z.boolean().optional().describe('Boolean flag: wait_for_completion'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from tasks.get API'),
  },
  {
    type: 'elasticsearch.tasks.list',
    connectorIdRequired: false,
    description: 'GET _tasks - 11 parameters',
    methods: ['GET'],
    patterns: ['_tasks'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-tasks',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'actions',
        'detailed',
        'group_by',
        'nodes',
        'parent_task_id',
        'timeout',
        'wait_for_completion',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      actions: z.array(z.string()).optional().describe('Array parameter: actions'),
      detailed: z.boolean().optional().describe('Boolean flag: detailed'),
      group_by: z
        .enum(['nodes', 'parents', 'none'])
        .optional()
        .describe('Enum parameter: group_by'),
      nodes: z.array(z.string()).optional().describe('Array parameter: nodes'),
      parent_task_id: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: parent_task_id'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      wait_for_completion: z.boolean().optional().describe('Boolean flag: wait_for_completion'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from tasks.list API'),
  },
  {
    type: 'elasticsearch.terms_enum',
    connectorIdRequired: false,
    description: 'GET/POST {index}/_terms_enum - 4 parameters',
    methods: ['GET', 'POST'],
    patterns: ['{index}/_terms_enum'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-terms-enum',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from terms_enum API'),
  },
  {
    type: 'elasticsearch.termvectors',
    connectorIdRequired: false,
    description: 'GET/POST {index}/_termvectors/{id} | {index}/_termvectors - 15 parameters',
    methods: ['GET', 'POST'],
    patterns: ['{index}/_termvectors/{id}', '{index}/_termvectors'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-termvectors',
    parameterTypes: {
      pathParams: ['index', 'id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'fields',
        'field_statistics',
        'offsets',
        'payloads',
        'positions',
        'preference',
        'realtime',
        'routing',
        'term_statistics',
        'version',
        'version_type',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      fields: z.array(z.string()).optional().describe('Array parameter: fields'),
      field_statistics: z.boolean().optional().describe('Boolean flag: field_statistics'),
      offsets: z.boolean().optional().describe('Boolean flag: offsets'),
      payloads: z.boolean().optional().describe('Boolean flag: payloads'),
      positions: z.boolean().optional().describe('Boolean flag: positions'),
      preference: z.union([z.string(), z.number()]).optional().describe('Parameter: preference'),
      realtime: z.boolean().optional().describe('Boolean flag: realtime'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      term_statistics: z.boolean().optional().describe('Boolean flag: term_statistics'),
      version: z.union([z.string(), z.number()]).optional().describe('Parameter: version'),
      version_type: z
        .enum(['internal', 'external', 'external_gte', 'force'])
        .optional()
        .describe('Enum parameter: version_type'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from termvectors API'),
  },
  {
    type: 'elasticsearch.text_structure.find_field_structure',
    connectorIdRequired: false,
    description: 'GET _text_structure/find_field_structure - 18 parameters',
    methods: ['GET'],
    patterns: ['_text_structure/find_field_structure'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-text_structure',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'column_names',
        'delimiter',
        'documents_to_sample',
        'ecs_compatibility',
        'explain',
        'field',
        'format',
        'grok_pattern',
        'index',
        'quote',
        'should_trim_fields',
        'timeout',
        'timestamp_field',
        'timestamp_format',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      column_names: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: column_names'),
      delimiter: z.union([z.string(), z.number()]).optional().describe('Parameter: delimiter'),
      documents_to_sample: z
        .union([z.number(), z.array(z.number()), z.enum(['1000'])])
        .optional()
        .describe('Numeric parameter: documents_to_sample'),
      ecs_compatibility: z
        .enum(['disabled', 'v1'])
        .optional()
        .describe('Enum parameter: ecs_compatibility'),
      explain: z.boolean().optional().describe('Boolean flag: explain'),
      field: z.union([z.string(), z.number()]).optional().describe('Parameter: field'),
      format: z
        .enum(['delimited', 'ndjson', 'semi_structured_text', 'xml'])
        .optional()
        .describe('Enum parameter: format'),
      grok_pattern: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: grok_pattern'),
      index: z.union([z.string(), z.number()]).optional().describe('Parameter: index'),
      quote: z.union([z.string(), z.number()]).optional().describe('Parameter: quote'),
      should_trim_fields: z.boolean().optional().describe('Boolean flag: should_trim_fields'),
      timeout: z.enum(['25s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      timestamp_field: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: timestamp_field'),
      timestamp_format: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: timestamp_format'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from text_structure.find_field_structure API'),
  },
  {
    type: 'elasticsearch.text_structure.find_message_structure',
    connectorIdRequired: false,
    description: 'GET/POST _text_structure/find_message_structure - 15 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_text_structure/find_message_structure'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-text-structure-find-message-structure',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'column_names',
        'delimiter',
        'ecs_compatibility',
        'explain',
        'format',
        'grok_pattern',
        'quote',
        'should_trim_fields',
        'timeout',
        'timestamp_field',
        'timestamp_format',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      column_names: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: column_names'),
      delimiter: z.union([z.string(), z.number()]).optional().describe('Parameter: delimiter'),
      ecs_compatibility: z
        .enum(['disabled', 'v1'])
        .optional()
        .describe('Enum parameter: ecs_compatibility'),
      explain: z.boolean().optional().describe('Boolean flag: explain'),
      format: z
        .enum(['delimited', 'ndjson', 'semi_structured_text', 'xml'])
        .optional()
        .describe('Enum parameter: format'),
      grok_pattern: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: grok_pattern'),
      quote: z.union([z.string(), z.number()]).optional().describe('Parameter: quote'),
      should_trim_fields: z.boolean().optional().describe('Boolean flag: should_trim_fields'),
      timeout: z.enum(['25s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      timestamp_field: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: timestamp_field'),
      timestamp_format: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: timestamp_format'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from text_structure.find_message_structure API'),
  },
  {
    type: 'elasticsearch.text_structure.find_structure',
    connectorIdRequired: false,
    description: 'POST _text_structure/find_structure - 15 parameters',
    methods: ['POST'],
    patterns: ['_text_structure/find_structure'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-text-structure-find-structure',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'charset',
        'column_names',
        'delimiter',
        'ecs_compatibility',
        'explain',
        'format',
        'grok_pattern',
        'has_header_row',
        'line_merge_size_limit',
        'lines_to_sample',
        'quote',
        'should_trim_fields',
        'timeout',
        'timestamp_field',
        'timestamp_format',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      charset: z.union([z.string(), z.number()]).optional().describe('Parameter: charset'),
      column_names: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: column_names'),
      delimiter: z.union([z.string(), z.number()]).optional().describe('Parameter: delimiter'),
      ecs_compatibility: z
        .enum(['disabled'])
        .optional()
        .describe('Enum parameter: ecs_compatibility'),
      explain: z.boolean().optional().describe('Boolean flag: explain'),
      format: z.union([z.string(), z.number()]).optional().describe('Parameter: format'),
      grok_pattern: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: grok_pattern'),
      has_header_row: z.boolean().optional().describe('Boolean flag: has_header_row'),
      line_merge_size_limit: z
        .union([z.number(), z.array(z.number()), z.enum(['10000'])])
        .optional()
        .describe('Numeric parameter: line_merge_size_limit'),
      lines_to_sample: z
        .union([z.number(), z.array(z.number()), z.enum(['1000'])])
        .optional()
        .describe('Numeric parameter: lines_to_sample'),
      quote: z.union([z.string(), z.number()]).optional().describe('Parameter: quote'),
      should_trim_fields: z.boolean().optional().describe('Boolean flag: should_trim_fields'),
      timeout: z.enum(['25s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      timestamp_field: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: timestamp_field'),
      timestamp_format: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: timestamp_format'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from text_structure.find_structure API'),
  },
  {
    type: 'elasticsearch.text_structure.test_grok_pattern',
    connectorIdRequired: false,
    description: 'GET/POST _text_structure/test_grok_pattern - 5 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_text_structure/test_grok_pattern'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-text-structure-test-grok-pattern',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'ecs_compatibility'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      ecs_compatibility: z
        .enum(['disabled'])
        .optional()
        .describe('Enum parameter: ecs_compatibility'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from text_structure.test_grok_pattern API'),
  },
  {
    type: 'elasticsearch.transform.delete_transform',
    connectorIdRequired: false,
    description: 'DELETE _transform/{transform_id} - 7 parameters',
    methods: ['DELETE'],
    patterns: ['_transform/{transform_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-delete-transform',
    parameterTypes: {
      pathParams: ['transform_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'force',
        'delete_dest_index',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      transform_id: z.string().describe('Path parameter: transform_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      force: z.boolean().optional().describe('Boolean flag: force'),
      delete_dest_index: z.boolean().optional().describe('Boolean flag: delete_dest_index'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from transform.delete_transform API'),
  },
  {
    type: 'elasticsearch.transform.get_node_stats',
    connectorIdRequired: false,
    description: 'GET _transform/_node_stats - 0 parameters',
    methods: ['GET'],
    patterns: ['_transform/_node_stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/get-transform-node-stats.html',
    parameterTypes: {
      pathParams: [],
      urlParams: [],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from transform.get_node_stats API'),
  },
  {
    type: 'elasticsearch.transform.get_transform',
    connectorIdRequired: false,
    description: 'GET _transform/{transform_id} | _transform - 8 parameters',
    methods: ['GET'],
    patterns: ['_transform/{transform_id}', '_transform'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-get-transform',
    parameterTypes: {
      pathParams: ['transform_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_match',
        'from',
        'size',
        'exclude_generated',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      transform_id: z.string().describe('Path parameter: transform_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['100'])])
        .optional()
        .describe('Numeric parameter: size'),
      exclude_generated: z.boolean().optional().describe('Boolean flag: exclude_generated'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from transform.get_transform API'),
  },
  {
    type: 'elasticsearch.transform.get_transform_stats',
    connectorIdRequired: false,
    description: 'GET _transform/{transform_id}/_stats - 8 parameters',
    methods: ['GET'],
    patterns: ['_transform/{transform_id}/_stats'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-get-transform-stats',
    parameterTypes: {
      pathParams: ['transform_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_match',
        'from',
        'size',
        'timeout',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      transform_id: z.string().describe('Path parameter: transform_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      size: z
        .union([z.number(), z.array(z.number()), z.enum(['100'])])
        .optional()
        .describe('Numeric parameter: size'),
      timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from transform.get_transform_stats API'),
  },
  {
    type: 'elasticsearch.transform.preview_transform',
    connectorIdRequired: false,
    description: 'GET/POST _transform/{transform_id}/_preview | _transform/_preview - 5 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_transform/{transform_id}/_preview', '_transform/_preview'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-preview-transform',
    parameterTypes: {
      pathParams: ['transform_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      transform_id: z.string().describe('Path parameter: transform_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from transform.preview_transform API'),
  },
  {
    type: 'elasticsearch.transform.put_transform',
    connectorIdRequired: false,
    description: 'PUT _transform/{transform_id} - 6 parameters',
    methods: ['PUT'],
    patterns: ['_transform/{transform_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-put-transform',
    parameterTypes: {
      pathParams: ['transform_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'defer_validation', 'timeout'],
      bodyParams: ['source', 'dest', 'pivot', 'description', 'frequency'],
    },
    paramsSchema: z.object({
      transform_id: z.string().describe('Path parameter: transform_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      defer_validation: z.boolean().optional().describe('Boolean flag: defer_validation'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      source: z.object({}).passthrough().optional().describe('Source configuration'),
      dest: z.object({}).passthrough().optional().describe('Destination configuration'),
      pivot: z.object({}).passthrough().optional().describe('Pivot configuration'),
      description: z.string().optional().describe('Description'),
      frequency: z.string().optional().describe('Frequency'),
    }),
    outputSchema: z.any().describe('Response from transform.put_transform API'),
  },
  {
    type: 'elasticsearch.transform.reset_transform',
    connectorIdRequired: false,
    description: 'POST _transform/{transform_id}/_reset - 6 parameters',
    methods: ['POST'],
    patterns: ['_transform/{transform_id}/_reset'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-reset-transform',
    parameterTypes: {
      pathParams: ['transform_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'force', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      transform_id: z.string().describe('Path parameter: transform_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      force: z.boolean().optional().describe('Boolean flag: force'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from transform.reset_transform API'),
  },
  {
    type: 'elasticsearch.transform.schedule_now_transform',
    connectorIdRequired: false,
    description: 'POST _transform/{transform_id}/_schedule_now - 5 parameters',
    methods: ['POST'],
    patterns: ['_transform/{transform_id}/_schedule_now'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-schedule-now-transform',
    parameterTypes: {
      pathParams: ['transform_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      transform_id: z.string().describe('Path parameter: transform_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from transform.schedule_now_transform API'),
  },
  {
    type: 'elasticsearch.transform.start_transform',
    connectorIdRequired: false,
    description: 'POST _transform/{transform_id}/_start - 6 parameters',
    methods: ['POST'],
    patterns: ['_transform/{transform_id}/_start'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-start-transform',
    parameterTypes: {
      pathParams: ['transform_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'timeout', 'from'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      transform_id: z.string().describe('Path parameter: transform_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from transform.start_transform API'),
  },
  {
    type: 'elasticsearch.transform.stop_transform',
    connectorIdRequired: false,
    description: 'POST _transform/{transform_id}/_stop - 9 parameters',
    methods: ['POST'],
    patterns: ['_transform/{transform_id}/_stop'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-stop-transform',
    parameterTypes: {
      pathParams: ['transform_id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_match',
        'force',
        'timeout',
        'wait_for_checkpoint',
        'wait_for_completion',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      transform_id: z.string().describe('Path parameter: transform_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_match: z.boolean().optional().describe('Boolean flag: allow_no_match'),
      force: z.boolean().optional().describe('Boolean flag: force'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      wait_for_checkpoint: z.boolean().optional().describe('Boolean flag: wait_for_checkpoint'),
      wait_for_completion: z.boolean().optional().describe('Boolean flag: wait_for_completion'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from transform.stop_transform API'),
  },
  {
    type: 'elasticsearch.transform.update_transform',
    connectorIdRequired: false,
    description: 'POST _transform/{transform_id}/_update - 6 parameters',
    methods: ['POST'],
    patterns: ['_transform/{transform_id}/_update'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-update-transform',
    parameterTypes: {
      pathParams: ['transform_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'defer_validation', 'timeout'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      transform_id: z.string().describe('Path parameter: transform_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      defer_validation: z.boolean().optional().describe('Boolean flag: defer_validation'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from transform.update_transform API'),
  },
  {
    type: 'elasticsearch.transform.upgrade_transforms',
    connectorIdRequired: false,
    description: 'POST _transform/_upgrade - 6 parameters',
    methods: ['POST'],
    patterns: ['_transform/_upgrade'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-upgrade-transforms',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'dry_run', 'timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      dry_run: z.boolean().optional().describe('Boolean flag: dry_run'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from transform.upgrade_transforms API'),
  },
  {
    type: 'elasticsearch.update',
    connectorIdRequired: false,
    description: 'POST {index}/_update/{id} - 17 parameters',
    methods: ['POST'],
    patterns: ['{index}/_update/{id}'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-update',
    parameterTypes: {
      pathParams: ['index', 'id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'if_primary_term',
        'if_seq_no',
        'include_source_on_error',
        'lang',
        'refresh',
        'require_alias',
        'retry_on_conflict',
        'routing',
        'timeout',
        'wait_for_active_shards',
        '_source',
        '_source_excludes',
        '_source_includes',
      ],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      if_primary_term: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: if_primary_term'),
      if_seq_no: z.union([z.string(), z.number()]).optional().describe('Parameter: if_seq_no'),
      include_source_on_error: z
        .boolean()
        .optional()
        .describe('Boolean flag: include_source_on_error'),
      lang: z.enum(['painless']).optional().describe('Enum parameter: lang'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      require_alias: z.boolean().optional().describe('Boolean flag: require_alias'),
      retry_on_conflict: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: retry_on_conflict'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      timeout: z.enum(['1m', '-1', '0']).optional().describe('Enum parameter: timeout'),
      wait_for_active_shards: z
        .enum(['1', 'all', 'index-setting'])
        .optional()
        .describe('Enum parameter: wait_for_active_shards'),
      _source: z.boolean().optional().describe('Boolean flag: _source'),
      _source_excludes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_excludes'),
      _source_includes: z
        .array(z.string())
        .optional()
        .describe('Array parameter: _source_includes'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from update API'),
  },
  {
    type: 'elasticsearch.update_by_query',
    connectorIdRequired: false,
    description: 'POST {index}/_update_by_query - 35 parameters',
    methods: ['POST'],
    patterns: ['{index}/_update_by_query'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-update-by-query',
    parameterTypes: {
      pathParams: ['index'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'allow_no_indices',
        'analyzer',
        'analyze_wildcard',
        'conflicts',
        'default_operator',
        'df',
        'expand_wildcards',
        'from',
        'ignore_unavailable',
        'lenient',
        'max_docs',
        'pipeline',
        'preference',
        'q',
        'refresh',
        'request_cache',
        'requests_per_second',
        'routing',
        'scroll',
        'scroll_size',
        'search_timeout',
        'search_type',
        'slices',
        'sort',
        'stats',
        'terminate_after',
        'timeout',
        'version',
        'version_type',
        'wait_for_active_shards',
        'wait_for_completion',
      ],
      bodyParams: ['query', 'script', 'conflicts'],
    },
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      allow_no_indices: z.boolean().optional().describe('Boolean flag: allow_no_indices'),
      analyzer: z.union([z.string(), z.number()]).optional().describe('Parameter: analyzer'),
      analyze_wildcard: z.boolean().optional().describe('Boolean flag: analyze_wildcard'),
      conflicts: z.enum(['abort', 'proceed']).optional().describe('Enum parameter: conflicts'),
      default_operator: z
        .enum(['and', 'or'])
        .optional()
        .describe('Enum parameter: default_operator'),
      df: z.union([z.string(), z.number()]).optional().describe('Parameter: df'),
      expand_wildcards: z
        .enum(['all', 'open', 'closed', 'hidden', 'none'])
        .optional()
        .describe('Enum parameter: expand_wildcards'),
      from: z.union([z.string(), z.number()]).optional().describe('Parameter: from'),
      ignore_unavailable: z.boolean().optional().describe('Boolean flag: ignore_unavailable'),
      lenient: z.boolean().optional().describe('Boolean flag: lenient'),
      max_docs: z.union([z.string(), z.number()]).optional().describe('Parameter: max_docs'),
      pipeline: z.union([z.string(), z.number()]).optional().describe('Parameter: pipeline'),
      preference: z.union([z.string(), z.number()]).optional().describe('Parameter: preference'),
      q: z.union([z.string(), z.number()]).optional().describe('Parameter: q'),
      refresh: z.boolean().optional().describe('Boolean flag: refresh'),
      request_cache: z.boolean().optional().describe('Boolean flag: request_cache'),
      requests_per_second: z
        .union([z.number(), z.array(z.number()), z.enum(['-1'])])
        .optional()
        .describe('Numeric parameter: requests_per_second'),
      routing: z.union([z.string(), z.number()]).optional().describe('Parameter: routing'),
      scroll: z.enum(['5m', '-1', '0']).optional().describe('Enum parameter: scroll'),
      scroll_size: z
        .union([z.number(), z.array(z.number()), z.enum(['1000'])])
        .optional()
        .describe('Numeric parameter: scroll_size'),
      search_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: search_timeout'),
      search_type: z
        .enum(['query_then_fetch', 'dfs_query_then_fetch'])
        .optional()
        .describe('Enum parameter: search_type'),
      slices: z.enum(['1', 'auto']).optional().describe('Enum parameter: slices'),
      sort: z.union([z.string(), z.number()]).optional().describe('Parameter: sort'),
      stats: z.union([z.string(), z.number()]).optional().describe('Parameter: stats'),
      terminate_after: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: terminate_after'),
      timeout: z.enum(['1m', '-1', '0']).optional().describe('Enum parameter: timeout'),
      version: z.boolean().optional().describe('Boolean flag: version'),
      version_type: z.boolean().optional().describe('Boolean flag: version_type'),
      wait_for_active_shards: z
        .enum(['1', 'all', 'index-setting'])
        .optional()
        .describe('Enum parameter: wait_for_active_shards'),
      wait_for_completion: z.boolean().optional().describe('Boolean flag: wait_for_completion'),
      query: z
        .union([z.string(), z.object({}).passthrough()])
        .optional()
        .describe('Query (ES-QL string or Elasticsearch Query DSL)'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
    }),
    outputSchema: z.any().describe('Response from update_by_query API'),
  },
  {
    type: 'elasticsearch.update_by_query_rethrottle',
    connectorIdRequired: false,
    description: 'POST _update_by_query/{task_id}/_rethrottle - 5 parameters',
    methods: ['POST'],
    patterns: ['_update_by_query/{task_id}/_rethrottle'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-update-by-query-rethrottle',
    parameterTypes: {
      pathParams: ['task_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'requests_per_second'],
      bodyParams: ['query', 'script', 'conflicts'],
    },
    paramsSchema: z.object({
      task_id: z.string().describe('Path parameter: task_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      requests_per_second: z
        .union([z.number(), z.array(z.number()), z.enum(['-1'])])
        .optional()
        .describe('Numeric parameter: requests_per_second'),
      query: z
        .union([z.string(), z.object({}).passthrough()])
        .optional()
        .describe('Query (ES-QL string or Elasticsearch Query DSL)'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      conflicts: z.enum(['abort', 'proceed']).optional().describe('Conflict resolution'),
    }),
    outputSchema: z.any().describe('Response from update_by_query_rethrottle API'),
  },
  {
    type: 'elasticsearch.watcher.ack_watch',
    connectorIdRequired: false,
    description:
      'PUT/POST _watcher/watch/{watch_id}/_ack | _watcher/watch/{watch_id}/_ack/{action_id} - 4 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_watcher/watch/{watch_id}/_ack', '_watcher/watch/{watch_id}/_ack/{action_id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-ack-watch',
    parameterTypes: {
      pathParams: ['watch_id', 'action_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      watch_id: z.string().describe('Path parameter: watch_id (required)'),
      action_id: z.string().describe('Path parameter: action_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from watcher.ack_watch API'),
  },
  {
    type: 'elasticsearch.watcher.activate_watch',
    connectorIdRequired: false,
    description: 'PUT/POST _watcher/watch/{watch_id}/_activate - 4 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_watcher/watch/{watch_id}/_activate'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-activate-watch',
    parameterTypes: {
      pathParams: ['watch_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      watch_id: z.string().describe('Path parameter: watch_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from watcher.activate_watch API'),
  },
  {
    type: 'elasticsearch.watcher.deactivate_watch',
    connectorIdRequired: false,
    description: 'PUT/POST _watcher/watch/{watch_id}/_deactivate - 4 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_watcher/watch/{watch_id}/_deactivate'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-deactivate-watch',
    parameterTypes: {
      pathParams: ['watch_id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      watch_id: z.string().describe('Path parameter: watch_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from watcher.deactivate_watch API'),
  },
  {
    type: 'elasticsearch.watcher.delete_watch',
    connectorIdRequired: false,
    description: 'DELETE _watcher/watch/{id} - 4 parameters',
    methods: ['DELETE'],
    patterns: ['_watcher/watch/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-delete-watch',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from watcher.delete_watch API'),
  },
  {
    type: 'elasticsearch.watcher.execute_watch',
    connectorIdRequired: false,
    description: 'PUT/POST _watcher/watch/{id}/_execute | _watcher/watch/_execute - 5 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_watcher/watch/{id}/_execute', '_watcher/watch/_execute'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-execute-watch',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'debug'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      debug: z.boolean().optional().describe('Boolean flag: debug'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from watcher.execute_watch API'),
  },
  {
    type: 'elasticsearch.watcher.get_settings',
    connectorIdRequired: false,
    description: 'GET _watcher/settings - 5 parameters',
    methods: ['GET'],
    patterns: ['_watcher/settings'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-get-settings',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from watcher.get_settings API'),
  },
  {
    type: 'elasticsearch.watcher.get_watch',
    connectorIdRequired: false,
    description: 'GET _watcher/watch/{id} - 4 parameters',
    methods: ['GET'],
    patterns: ['_watcher/watch/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-get-watch',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from watcher.get_watch API'),
  },
  {
    type: 'elasticsearch.watcher.put_watch',
    connectorIdRequired: false,
    description: 'PUT/POST _watcher/watch/{id} - 8 parameters',
    methods: ['PUT', 'POST'],
    patterns: ['_watcher/watch/{id}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-put-watch',
    parameterTypes: {
      pathParams: ['id'],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'active',
        'if_primary_term',
        'if_seq_no',
        'version',
      ],
      bodyParams: ['trigger', 'input', 'condition', 'actions', 'metadata'],
    },
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      active: z.boolean().optional().describe('Boolean flag: active'),
      if_primary_term: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Parameter: if_primary_term'),
      if_seq_no: z.union([z.string(), z.number()]).optional().describe('Parameter: if_seq_no'),
      version: z.union([z.string(), z.number()]).optional().describe('Parameter: version'),
      trigger: z.object({}).passthrough().optional().describe('Watch trigger'),
      input: z.object({}).passthrough().optional().describe('Watch input'),
      condition: z.object({}).passthrough().optional().describe('Watch condition'),
      actions: z.object({}).passthrough().optional().describe('Watch actions'),
      metadata: z.object({}).passthrough().optional().describe('Metadata'),
    }),
    outputSchema: z.any().describe('Response from watcher.put_watch API'),
  },
  {
    type: 'elasticsearch.watcher.query_watches',
    connectorIdRequired: false,
    description: 'GET/POST _watcher/_query/watches - 4 parameters',
    methods: ['GET', 'POST'],
    patterns: ['_watcher/_query/watches'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-query-watches',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from watcher.query_watches API'),
  },
  {
    type: 'elasticsearch.watcher.start',
    connectorIdRequired: false,
    description: 'POST _watcher/_start - 5 parameters',
    methods: ['POST'],
    patterns: ['_watcher/_start'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-start',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from watcher.start API'),
  },
  {
    type: 'elasticsearch.watcher.stats',
    connectorIdRequired: false,
    description: 'GET _watcher/stats | _watcher/stats/{metric} - 6 parameters',
    methods: ['GET'],
    patterns: ['_watcher/stats', '_watcher/stats/{metric}'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-stats',
    parameterTypes: {
      pathParams: ['metric'],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'emit_stacktraces', 'metric'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      metric: z.string().describe('Path parameter: metric (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      emit_stacktraces: z.boolean().optional().describe('Boolean flag: emit_stacktraces'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from watcher.stats API'),
  },
  {
    type: 'elasticsearch.watcher.stop',
    connectorIdRequired: false,
    description: 'POST _watcher/_stop - 5 parameters',
    methods: ['POST'],
    patterns: ['_watcher/_stop'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-stop',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from watcher.stop API'),
  },
  {
    type: 'elasticsearch.watcher.update_settings',
    connectorIdRequired: false,
    description: 'PUT _watcher/settings - 6 parameters',
    methods: ['PUT'],
    patterns: ['_watcher/settings'],
    isInternal: true,
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-update-settings',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout', 'timeout'],
      bodyParams: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: master_timeout'),
      timeout: z
        .union([z.number(), z.array(z.number()), z.enum(['-1', '0'])])
        .optional()
        .describe('Numeric parameter: timeout'),
      doc: z.object({}).passthrough().optional().describe('Document content'),
      script: z.object({}).passthrough().optional().describe('Script configuration'),
      upsert: z.object({}).passthrough().optional().describe('Upsert document'),
      doc_as_upsert: z.boolean().optional().describe('Use doc as upsert'),
    }),
    outputSchema: z.any().describe('Response from watcher.update_settings API'),
  },
  {
    type: 'elasticsearch.xpack.info',
    connectorIdRequired: false,
    description: 'GET _xpack - 6 parameters',
    methods: ['GET'],
    patterns: ['_xpack'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-info',
    parameterTypes: {
      pathParams: [],
      urlParams: [
        'error_trace',
        'filter_path',
        'human',
        'pretty',
        'categories',
        'accept_enterprise',
      ],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      categories: z
        .enum(['build', 'features', 'license'])
        .optional()
        .describe('Enum parameter: categories'),
      accept_enterprise: z.boolean().optional().describe('Boolean flag: accept_enterprise'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from xpack.info API'),
  },
  {
    type: 'elasticsearch.xpack.usage',
    connectorIdRequired: false,
    description: 'GET _xpack/usage - 5 parameters',
    methods: ['GET'],
    patterns: ['_xpack/usage'],
    isInternal: true,
    documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-xpack',
    parameterTypes: {
      pathParams: [],
      urlParams: ['error_trace', 'filter_path', 'human', 'pretty', 'master_timeout'],
      bodyParams: ['body'],
    },
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      master_timeout: z
        .enum(['30s', '-1', '0'])
        .optional()
        .describe('Enum parameter: master_timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from xpack.usage API'),
  },
];

export const ELASTICSEARCH_CONNECTOR_COUNT = 568;
