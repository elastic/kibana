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
 * Generated at: 2025-08-31T11:43:40.233Z
 * Source: Console definitions (568 APIs)
 *
 * To regenerate: npm run generate:es-connectors
 */

import { z } from '@kbn/zod';
import type { ConnectorContract } from '@kbn/workflows';

export const GENERATED_ELASTICSEARCH_CONNECTORS: ConnectorContract[] = [
  {
    type: 'elasticsearch._internal.delete_desired_balance',
    connectorIdRequired: false,
    description: 'DELETE _internal/desired_balance - 0 parameters',
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from _internal.delete_desired_balance API'),
  },
  {
    type: 'elasticsearch._internal.delete_desired_nodes',
    connectorIdRequired: false,
    description: 'DELETE _internal/desired_nodes - 0 parameters',
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from _internal.delete_desired_nodes API'),
  },
  {
    type: 'elasticsearch._internal.get_desired_balance',
    connectorIdRequired: false,
    description: 'GET _internal/desired_balance - 0 parameters',
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from _internal.get_desired_balance API'),
  },
  {
    type: 'elasticsearch._internal.get_desired_nodes',
    connectorIdRequired: false,
    description: 'GET _internal/desired_nodes/_latest - 0 parameters',
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from _internal.get_desired_nodes API'),
  },
  {
    type: 'elasticsearch._internal.prevalidate_node_removal',
    connectorIdRequired: false,
    description: 'POST _internal/prevalidate_node_removal - 0 parameters',
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from _internal.prevalidate_node_removal API'),
  },
  {
    type: 'elasticsearch._internal.update_desired_nodes',
    connectorIdRequired: false,
    description: 'PUT _internal/desired_nodes/{history_id}/{version} - 0 parameters',
    paramsSchema: z.object({
      history_id: z.string().describe('Path parameter: history_id (required)'),
      version: z.string().describe('Path parameter: version (required)'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from _internal.update_desired_nodes API'),
  },
  {
    type: 'elasticsearch.async_search.delete',
    connectorIdRequired: false,
    description: 'DELETE _async_search/{id} - 4 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from bulk API'),
  },
  {
    type: 'elasticsearch.capabilities',
    connectorIdRequired: false,
    description: 'GET _capabilities - 0 parameters',
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from capabilities API'),
  },
  {
    type: 'elasticsearch.cat.aliases',
    connectorIdRequired: false,
    description: 'GET _cat/aliases | _cat/aliases/{name} - 11 parameters',
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
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cat.help API'),
  },
  {
    type: 'elasticsearch.cat.indices',
    connectorIdRequired: false,
    description: 'GET _cat/indices | _cat/indices/{index} - 16 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cluster.put_component_template API'),
  },
  {
    type: 'elasticsearch.cluster.put_settings',
    connectorIdRequired: false,
    description: 'PUT _cluster/settings - 7 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from cluster.put_settings API'),
  },
  {
    type: 'elasticsearch.cluster.remote_info',
    connectorIdRequired: false,
    description: 'GET _remote/info - 4 parameters',
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
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.secret_post API'),
  },
  {
    type: 'elasticsearch.connector.secret_put',
    connectorIdRequired: false,
    description: 'PUT _connector/_secret/{id} - 0 parameters',
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
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.update_active_filtering API'),
  },
  {
    type: 'elasticsearch.connector.update_api_key_id',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_api_key_id - 4 parameters',
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.update_api_key_id API'),
  },
  {
    type: 'elasticsearch.connector.update_configuration',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_configuration - 4 parameters',
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.update_configuration API'),
  },
  {
    type: 'elasticsearch.connector.update_error',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_error - 4 parameters',
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.update_error API'),
  },
  {
    type: 'elasticsearch.connector.update_features',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_features - 4 parameters',
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.update_features API'),
  },
  {
    type: 'elasticsearch.connector.update_filtering',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_filtering - 4 parameters',
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.update_filtering API'),
  },
  {
    type: 'elasticsearch.connector.update_filtering_validation',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_filtering/_validation - 4 parameters',
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.update_filtering_validation API'),
  },
  {
    type: 'elasticsearch.connector.update_index_name',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_index_name - 4 parameters',
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.update_index_name API'),
  },
  {
    type: 'elasticsearch.connector.update_name',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_name - 4 parameters',
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.update_name API'),
  },
  {
    type: 'elasticsearch.connector.update_native',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_native - 4 parameters',
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.update_native API'),
  },
  {
    type: 'elasticsearch.connector.update_pipeline',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_pipeline - 4 parameters',
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.update_pipeline API'),
  },
  {
    type: 'elasticsearch.connector.update_scheduling',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_scheduling - 4 parameters',
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.update_scheduling API'),
  },
  {
    type: 'elasticsearch.connector.update_service_type',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_service_type - 4 parameters',
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.update_service_type API'),
  },
  {
    type: 'elasticsearch.connector.update_status',
    connectorIdRequired: false,
    description: 'PUT _connector/{connector_id}/_status - 4 parameters',
    paramsSchema: z.object({
      connector_id: z.string().describe('Path parameter: connector_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from connector.update_status API'),
  },
  {
    type: 'elasticsearch.count',
    connectorIdRequired: false,
    description: 'POST/GET _count | {index}/_count - 18 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from create API'),
  },
  {
    type: 'elasticsearch.dangling_indices.delete_dangling_index',
    connectorIdRequired: false,
    description: 'DELETE _dangling/{index_uuid} - 7 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from delete_by_query API'),
  },
  {
    type: 'elasticsearch.delete_by_query_rethrottle',
    connectorIdRequired: false,
    description: 'POST _delete_by_query/{task_id}/_rethrottle - 5 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from delete_by_query_rethrottle API'),
  },
  {
    type: 'elasticsearch.delete_script',
    connectorIdRequired: false,
    description: 'DELETE _scripts/{id} - 6 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from eql.search API'),
  },
  {
    type: 'elasticsearch.esql.async_query',
    connectorIdRequired: false,
    description: 'POST _query/async - 8 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from esql.query API'),
  },
  {
    type: 'elasticsearch.exists',
    connectorIdRequired: false,
    description: 'HEAD {index}/_doc/{id} - 14 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from fleet.msearch API'),
  },
  {
    type: 'elasticsearch.fleet.post_secret',
    connectorIdRequired: false,
    description: 'POST _fleet/secret - 0 parameters',
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from fleet.post_secret API'),
  },
  {
    type: 'elasticsearch.fleet.search',
    connectorIdRequired: false,
    description: 'GET/POST {index}/_fleet/_fleet_search - 47 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from fleet.search API'),
  },
  {
    type: 'elasticsearch.get',
    connectorIdRequired: false,
    description: 'GET {index}/_doc/{id} - 15 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from index API'),
  },
  {
    type: 'elasticsearch.indices.add_block',
    connectorIdRequired: false,
    description: 'PUT {index}/_block/{block} - 9 parameters',
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
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.cancel_migrate_reindex API'),
  },
  {
    type: 'elasticsearch.indices.clear_cache',
    connectorIdRequired: false,
    description: 'POST _cache/clear | {index}/_cache/clear - 12 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.create API'),
  },
  {
    type: 'elasticsearch.indices.create_data_stream',
    connectorIdRequired: false,
    description: 'PUT _data_stream/{name} - 6 parameters',
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
    paramsSchema: z.object({
      source: z.string().describe('Path parameter: source (required)'),
      dest: z.string().describe('Path parameter: dest (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.create_from API'),
  },
  {
    type: 'elasticsearch.indices.data_streams_stats',
    connectorIdRequired: false,
    description: 'GET _data_stream/_stats | _data_stream/{name}/_stats - 5 parameters',
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
    paramsSchema: z.object({
      index: z.string().describe('Path parameter: index (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.get_migrate_reindex_status API'),
  },
  {
    type: 'elasticsearch.indices.get_settings',
    connectorIdRequired: false,
    description:
      'GET _settings | {index}/_settings | {index}/_settings/{name} | _settings/{name} - 11 parameters',
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
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.migrate_reindex API'),
  },
  {
    type: 'elasticsearch.indices.migrate_to_data_stream',
    connectorIdRequired: false,
    description: 'POST _data_stream/_migrate/{name} - 6 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.put_index_template API'),
  },
  {
    type: 'elasticsearch.indices.put_mapping',
    connectorIdRequired: false,
    description: 'PUT/POST {index}/_mapping - 10 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.put_mapping API'),
  },
  {
    type: 'elasticsearch.indices.put_settings',
    connectorIdRequired: false,
    description: 'PUT _settings | {index}/_settings - 12 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.put_settings API'),
  },
  {
    type: 'elasticsearch.indices.put_template',
    connectorIdRequired: false,
    description: 'PUT/POST _template/{name} - 8 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from indices.put_template API'),
  },
  {
    type: 'elasticsearch.indices.recovery',
    connectorIdRequired: false,
    description: 'GET _recovery | {index}/_recovery - 6 parameters',
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
    outputSchema: z.any().describe('Response from indices.update_aliases API'),
  },
  {
    type: 'elasticsearch.indices.validate_query',
    connectorIdRequired: false,
    description: 'GET/POST _validate/query | {index}/_validate/query - 16 parameters',
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
    paramsSchema: z.object({
      inference_id: z.string().describe('Path parameter: inference_id (required)'),
      task_type: z.string().describe('Path parameter: task_type (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from inference.update API'),
  },
  {
    type: 'elasticsearch.info',
    connectorIdRequired: false,
    description: 'GET elasticsearch.info - 4 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ingest.put_pipeline API'),
  },
  {
    type: 'elasticsearch.ingest.simulate',
    connectorIdRequired: false,
    description:
      'GET/POST _ingest/pipeline/_simulate | _ingest/pipeline/{id}/_simulate - 5 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.put_datafeed API'),
  },
  {
    type: 'elasticsearch.ml.put_filter',
    connectorIdRequired: false,
    description: 'PUT _ml/filters/{filter_id} - 4 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.put_job API'),
  },
  {
    type: 'elasticsearch.ml.put_trained_model',
    connectorIdRequired: false,
    description: 'PUT _ml/trained_models/{model_id} - 6 parameters',
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
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.update_data_frame_analytics API'),
  },
  {
    type: 'elasticsearch.ml.update_datafeed',
    connectorIdRequired: false,
    description: 'POST _ml/datafeeds/{datafeed_id}/_update - 8 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.update_datafeed API'),
  },
  {
    type: 'elasticsearch.ml.update_filter',
    connectorIdRequired: false,
    description: 'POST _ml/filters/{filter_id}/_update - 4 parameters',
    paramsSchema: z.object({
      filter_id: z.string().describe('Path parameter: filter_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.update_filter API'),
  },
  {
    type: 'elasticsearch.ml.update_job',
    connectorIdRequired: false,
    description: 'POST _ml/anomaly_detectors/{job_id}/_update - 4 parameters',
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.update_job API'),
  },
  {
    type: 'elasticsearch.ml.update_model_snapshot',
    connectorIdRequired: false,
    description:
      'POST _ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_update - 4 parameters',
    paramsSchema: z.object({
      job_id: z.string().describe('Path parameter: job_id (required)'),
      snapshot_id: z.string().describe('Path parameter: snapshot_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.update_model_snapshot API'),
  },
  {
    type: 'elasticsearch.ml.update_trained_model_deployment',
    connectorIdRequired: false,
    description: 'POST _ml/trained_models/{model_id}/deployment/_update - 5 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from ml.update_trained_model_deployment API'),
  },
  {
    type: 'elasticsearch.ml.upgrade_job_snapshot',
    connectorIdRequired: false,
    description:
      'POST _ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_upgrade - 6 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from monitoring.bulk API'),
  },
  {
    type: 'elasticsearch.msearch',
    connectorIdRequired: false,
    description: 'GET/POST _msearch | {index}/_msearch - 17 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from msearch API'),
  },
  {
    type: 'elasticsearch.msearch_template',
    connectorIdRequired: false,
    description: 'GET/POST _msearch/template | {index}/_msearch/template - 9 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from msearch_template API'),
  },
  {
    type: 'elasticsearch.mtermvectors',
    connectorIdRequired: false,
    description: 'GET/POST _mtermvectors | {index}/_mtermvectors - 16 parameters',
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
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from profiling.flamegraph API'),
  },
  {
    type: 'elasticsearch.profiling.stacktraces',
    connectorIdRequired: false,
    description: 'POST _profiling/stacktraces - 0 parameters',
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from profiling.stacktraces API'),
  },
  {
    type: 'elasticsearch.profiling.status',
    connectorIdRequired: false,
    description: 'GET _profiling/status - 0 parameters',
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from profiling.status API'),
  },
  {
    type: 'elasticsearch.profiling.topn_functions',
    connectorIdRequired: false,
    description: 'POST _profiling/topn/functions - 0 parameters',
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from profiling.topn_functions API'),
  },
  {
    type: 'elasticsearch.put_script',
    connectorIdRequired: false,
    description: 'PUT/POST _scripts/{id} | _scripts/{id}/{context} - 7 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from reindex API'),
  },
  {
    type: 'elasticsearch.reindex_rethrottle',
    connectorIdRequired: false,
    description: 'POST _reindex/{task_id}/_rethrottle - 5 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from reindex_rethrottle API'),
  },
  {
    type: 'elasticsearch.render_search_template',
    connectorIdRequired: false,
    description: 'GET/POST _render/template | _render/template/{id} - 4 parameters',
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from render_search_template API'),
  },
  {
    type: 'elasticsearch.rollup.delete_job',
    connectorIdRequired: false,
    description: 'DELETE _rollup/job/{id} - 4 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from search API'),
  },
  {
    type: 'elasticsearch.search_application.delete',
    connectorIdRequired: false,
    description: 'DELETE _application/search_application/{name} - 4 parameters',
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
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      typed_keys: z.boolean().optional().describe('Boolean flag: typed_keys'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from search_application.search API'),
  },
  {
    type: 'elasticsearch.search_mvt',
    connectorIdRequired: false,
    description: 'POST/GET {index}/_mvt/{field}/{zoom}/{x}/{y} - 11 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from search_template API'),
  },
  {
    type: 'elasticsearch.searchable_snapshots.cache_stats',
    connectorIdRequired: false,
    description:
      'GET _searchable_snapshots/cache/stats | _searchable_snapshots/{node_id}/cache/stats - 5 parameters',
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
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.bulk_delete_role API'),
  },
  {
    type: 'elasticsearch.security.bulk_put_role',
    connectorIdRequired: false,
    description: 'POST _security/role - 5 parameters',
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.bulk_put_role API'),
  },
  {
    type: 'elasticsearch.security.bulk_update_api_keys',
    connectorIdRequired: false,
    description: 'POST _security/api_key/_bulk_update - 4 parameters',
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.bulk_update_api_keys API'),
  },
  {
    type: 'elasticsearch.security.change_password',
    connectorIdRequired: false,
    description:
      'PUT/POST _security/user/{username}/_password | _security/user/_password - 5 parameters',
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
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.create_api_key API'),
  },
  {
    type: 'elasticsearch.security.create_cross_cluster_api_key',
    connectorIdRequired: false,
    description: 'POST _security/cross_cluster/api_key - 4 parameters',
    paramsSchema: z.object({
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.create_cross_cluster_api_key API'),
  },
  {
    type: 'elasticsearch.security.create_service_token',
    connectorIdRequired: false,
    description:
      'PUT/POST _security/service/{namespace}/{service}/credential/token/{name} | _security/service/{namespace}/{service}/credential/token - 5 parameters',
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
    outputSchema: z.any().describe('Response from security.create_service_token API'),
  },
  {
    type: 'elasticsearch.security.delegate_pki',
    connectorIdRequired: false,
    description: 'POST _security/delegate_pki - 4 parameters',
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
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.put_role API'),
  },
  {
    type: 'elasticsearch.security.put_role_mapping',
    connectorIdRequired: false,
    description: 'PUT/POST _security/role_mapping/{name} - 5 parameters',
    paramsSchema: z.object({
      name: z.string().describe('Path parameter: name (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.put_role_mapping API'),
  },
  {
    type: 'elasticsearch.security.put_user',
    connectorIdRequired: false,
    description: 'PUT/POST _security/user/{username} - 5 parameters',
    paramsSchema: z.object({
      username: z.string().describe('Path parameter: username (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      refresh: z.enum(['true', 'false', 'wait_for']).optional().describe('Enum parameter: refresh'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.put_user API'),
  },
  {
    type: 'elasticsearch.security.query_api_keys',
    connectorIdRequired: false,
    description: 'GET/POST _security/_query/api_key - 7 parameters',
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
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.update_api_key API'),
  },
  {
    type: 'elasticsearch.security.update_cross_cluster_api_key',
    connectorIdRequired: false,
    description: 'PUT _security/cross_cluster/api_key/{id} - 4 parameters',
    paramsSchema: z.object({
      id: z.string().describe('Path parameter: id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.update_cross_cluster_api_key API'),
  },
  {
    type: 'elasticsearch.security.update_settings',
    connectorIdRequired: false,
    description: 'PUT _security/settings - 6 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.update_settings API'),
  },
  {
    type: 'elasticsearch.security.update_user_profile_data',
    connectorIdRequired: false,
    description: 'PUT/POST _security/profile/{uid}/_data - 7 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from security.update_user_profile_data API'),
  },
  {
    type: 'elasticsearch.shutdown.delete_node',
    connectorIdRequired: false,
    description: 'DELETE _nodes/{node_id}/shutdown - 6 parameters',
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
    outputSchema: z.any().describe('Response from snapshot.create API'),
  },
  {
    type: 'elasticsearch.snapshot.create_repository',
    connectorIdRequired: false,
    description: 'PUT/POST _snapshot/{repository} - 7 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from snapshot.create_repository API'),
  },
  {
    type: 'elasticsearch.snapshot.delete',
    connectorIdRequired: false,
    description: 'DELETE _snapshot/{repository}/{snapshot} - 5 parameters',
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
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from streams.logs_disable API'),
  },
  {
    type: 'elasticsearch.streams.logs_enable',
    connectorIdRequired: false,
    description: 'POST _streams/logs/_enable - 0 parameters',
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from streams.logs_enable API'),
  },
  {
    type: 'elasticsearch.streams.status',
    connectorIdRequired: false,
    description: 'GET _streams/status - 0 parameters',
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from streams.status API'),
  },
  {
    type: 'elasticsearch.synonyms.delete_synonym',
    connectorIdRequired: false,
    description: 'DELETE _synonyms/{id} - 4 parameters',
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
    paramsSchema: z.object({
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from transform.get_node_stats API'),
  },
  {
    type: 'elasticsearch.transform.get_transform',
    connectorIdRequired: false,
    description: 'GET _transform/{transform_id} | _transform - 8 parameters',
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
    paramsSchema: z.object({
      transform_id: z.string().describe('Path parameter: transform_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      defer_validation: z.boolean().optional().describe('Boolean flag: defer_validation'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from transform.put_transform API'),
  },
  {
    type: 'elasticsearch.transform.reset_transform',
    connectorIdRequired: false,
    description: 'POST _transform/{transform_id}/_reset - 6 parameters',
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
    paramsSchema: z.object({
      transform_id: z.string().describe('Path parameter: transform_id (required)'),
      error_trace: z.boolean().optional().describe('Boolean flag: error_trace'),
      filter_path: z.array(z.string()).optional().describe('Array parameter: filter_path'),
      human: z.boolean().optional().describe('Boolean flag: human'),
      pretty: z.boolean().optional().describe('Boolean flag: pretty'),
      defer_validation: z.boolean().optional().describe('Boolean flag: defer_validation'),
      timeout: z.enum(['30s', '-1', '0']).optional().describe('Enum parameter: timeout'),
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from transform.update_transform API'),
  },
  {
    type: 'elasticsearch.transform.upgrade_transforms',
    connectorIdRequired: false,
    description: 'POST _transform/_upgrade - 6 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from update API'),
  },
  {
    type: 'elasticsearch.update_by_query',
    connectorIdRequired: false,
    description: 'POST {index}/_update_by_query - 35 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from update_by_query API'),
  },
  {
    type: 'elasticsearch.update_by_query_rethrottle',
    connectorIdRequired: false,
    description: 'POST _update_by_query/{task_id}/_rethrottle - 5 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from update_by_query_rethrottle API'),
  },
  {
    type: 'elasticsearch.watcher.ack_watch',
    connectorIdRequired: false,
    description:
      'PUT/POST _watcher/watch/{watch_id}/_ack | _watcher/watch/{watch_id}/_ack/{action_id} - 4 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from watcher.put_watch API'),
  },
  {
    type: 'elasticsearch.watcher.query_watches',
    connectorIdRequired: false,
    description: 'GET/POST _watcher/_query/watches - 4 parameters',
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
      body: z.any().optional().describe('Request body'),
    }),
    outputSchema: z.any().describe('Response from watcher.update_settings API'),
  },
  {
    type: 'elasticsearch.xpack.info',
    connectorIdRequired: false,
    description: 'GET _xpack - 6 parameters',
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
