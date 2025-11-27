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
 * Generated at: 2025-11-27T07:04:28.239Z
 * Source: elasticsearch-specification repository, operations: ml-update-datafeed
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_update_datafeed_request, ml_update_datafeed_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_UPDATE_DATAFEED_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.update_datafeed',
  connectorGroup: 'internal',
  summary: `Update a datafeed`,
  description: `Update a datafeed.

You must stop and start the datafeed for the changes to be applied.
When Elasticsearch security features are enabled, your datafeed remembers which roles the user who updated it had at
the time of the update and runs the query using those same roles. If you provide secondary authorization headers,
those credentials are used instead.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-datafeed`,
  methods: ['POST'],
  patterns: ['_ml/datafeeds/{datafeed_id}/_update'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-datafeed',
  parameterTypes: {
    headerParams: [],
    pathParams: ['datafeed_id'],
    urlParams: ['allow_no_indices', 'expand_wildcards', 'ignore_throttled', 'ignore_unavailable'],
    bodyParams: [
      'aggregations',
      'chunking_config',
      'delayed_data_check_config',
      'frequency',
      'indices',
      'indices_options',
      'job_id',
      'max_empty_searches',
      'query',
      'query_delay',
      'runtime_mappings',
      'script_fields',
      'scroll_size',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_update_datafeed_request, 'body'),
    ...getShapeAt(ml_update_datafeed_request, 'path'),
    ...getShapeAt(ml_update_datafeed_request, 'query'),
  }),
  outputSchema: ml_update_datafeed_response,
};
