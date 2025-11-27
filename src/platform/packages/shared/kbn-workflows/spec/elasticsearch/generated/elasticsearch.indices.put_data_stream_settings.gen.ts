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
 * Generated at: 2025-11-27T07:04:28.223Z
 * Source: elasticsearch-specification repository, operations: indices-put-data-stream-settings
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_put_data_stream_settings_request,
  indices_put_data_stream_settings_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_PUT_DATA_STREAM_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.put_data_stream_settings',
  connectorGroup: 'internal',
  summary: `Update data stream settings`,
  description: `Update data stream settings.

This API can be used to override settings on specific data streams. These overrides will take precedence over what
is specified in the template that the data stream matches. To prevent your data stream from getting into an invalid state,
only certain settings are allowed. If possible, the setting change is applied to all
backing indices. Otherwise, it will be applied when the data stream is next rolled over.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-data-stream-settings`,
  methods: ['PUT'],
  patterns: ['_data_stream/{name}/_settings'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-data-stream-settings',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['dry_run', 'master_timeout', 'timeout'],
    bodyParams: [
      'index',
      'mode',
      'routing_path',
      'soft_deletes',
      'sort',
      'number_of_shards',
      'number_of_replicas',
      'number_of_routing_shards',
      'check_on_startup',
      'codec',
      'routing_partition_size',
      'load_fixed_bitset_filters_eagerly',
      'hidden',
      'auto_expand_replicas',
      'merge',
      'search',
      'refresh_interval',
      'max_result_window',
      'max_inner_result_window',
      'max_rescore_window',
      'max_docvalue_fields_search',
      'max_script_fields',
      'max_ngram_diff',
      'max_shingle_diff',
      'blocks',
      'max_refresh_listeners',
      'analyze',
      'highlight',
      'max_terms_count',
      'max_regex_length',
      'routing',
      'gc_deletes',
      'default_pipeline',
      'final_pipeline',
      'lifecycle',
      'provided_name',
      'creation_date',
      'creation_date_string',
      'uuid',
      'version',
      'verified_before_close',
      'format',
      'max_slices_per_scroll',
      'translog',
      'query_string',
      'priority',
      'top_metrics_max_size',
      'analysis',
      'settings',
      'time_series',
      'queries',
      'similarity',
      'mapping',
      'indexing.slowlog',
      'indexing_pressure',
      'store',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_put_data_stream_settings_request, 'body'),
    ...getShapeAt(indices_put_data_stream_settings_request, 'path'),
    ...getShapeAt(indices_put_data_stream_settings_request, 'query'),
  }),
  outputSchema: indices_put_data_stream_settings_response,
};
