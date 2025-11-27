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
 * Generated at: 2025-11-27T07:04:28.224Z
 * Source: elasticsearch-specification repository, operations: indices-put-settings, indices-put-settings-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_put_settings1_request,
  indices_put_settings1_response,
  indices_put_settings_request,
  indices_put_settings_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_PUT_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.put_settings',
  connectorGroup: 'internal',
  summary: `Update index settings`,
  description: `Update index settings.

Changes dynamic index settings in real time.
For data streams, index setting changes are applied to all backing indices by default.

To revert a setting to the default value, use a null value.
The list of per-index settings that can be updated dynamically on live indices can be found in index settings documentation.
To preserve existing settings from being updated, set the \`preserve_existing\` parameter to \`true\`.

For performance optimization during bulk indexing, you can disable the refresh interval.
Refer to [disable refresh interval](https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/indexing-speed#disable-refresh-interval) for an example.
There are multiple valid ways to represent index settings in the request body. You can specify only the setting, for example:

\`\`\`
{
  "number_of_replicas": 1
}
\`\`\`

Or you can use an \`index\` setting object:
\`\`\`
{
  "index": {
    "number_of_replicas": 1
  }
}
\`\`\`

Or you can use dot annotation:
\`\`\`
{
  "index.number_of_replicas": 1
}
\`\`\`

Or you can embed any of the aforementioned options in a \`settings\` object. For example:

\`\`\`
{
  "settings": {
    "index": {
      "number_of_replicas": 1
    }
  }
}
\`\`\`

NOTE: You can only define new analyzers on closed indices.
To add an analyzer, you must close the index, define the analyzer, and reopen the index.
You cannot close the write index of a data stream.
To update the analyzer for a data stream's write index and future backing indices, update the analyzer in the index template used by the stream.
Then roll over the data stream to apply the new analyzer to the stream's write index and future backing indices.
This affects searches and any new data added to the stream after the rollover.
However, it does not affect the data stream's backing indices or their existing data.
To change the analyzer for existing backing indices, you must create a new data stream and reindex your data into it.
Refer to [updating analyzers on existing indices](https://www.elastic.co/docs/manage-data/data-store/text-analysis/specify-an-analyzer#update-analyzers-on-existing-indices) for step-by-step examples.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-settings`,
  methods: ['PUT'],
  patterns: ['_settings', '{index}/_settings'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-settings',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'flat_settings',
      'ignore_unavailable',
      'master_timeout',
      'preserve_existing',
      'reopen',
      'timeout',
    ],
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
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_put_settings_request, 'body'),
      ...getShapeAt(indices_put_settings_request, 'path'),
      ...getShapeAt(indices_put_settings_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_put_settings1_request, 'body'),
      ...getShapeAt(indices_put_settings1_request, 'path'),
      ...getShapeAt(indices_put_settings1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([indices_put_settings_response, indices_put_settings1_response]),
};
