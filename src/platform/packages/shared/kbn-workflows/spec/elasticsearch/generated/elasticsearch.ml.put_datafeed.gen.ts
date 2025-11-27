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
 * Generated at: 2025-11-27T07:43:24.901Z
 * Source: elasticsearch-specification repository, operations: ml-put-datafeed
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_put_datafeed_request, ml_put_datafeed_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_PUT_DATAFEED_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_datafeed',
  connectorGroup: 'internal',
  summary: `Create a datafeed`,
  description: `Create a datafeed.

Datafeeds retrieve data from Elasticsearch for analysis by an anomaly detection job.
You can associate only one datafeed with each anomaly detection job.
The datafeed contains a query that runs at a defined interval (\`frequency\`).
If you are concerned about delayed data, you can add a delay (\`query_delay') at each interval.
By default, the datafeed uses the following query: \`{"match_all": {"boost": 1}}\`.

When Elasticsearch security features are enabled, your datafeed remembers which roles the user who created it had
at the time of creation and runs the query using those same roles. If you provide secondary authorization headers,
those credentials are used instead.
You must use Kibana, this API, or the create anomaly detection jobs API to create a datafeed. Do not add a datafeed
directly to the \`.ml-config\` index. Do not give users \`write\` privileges on the \`.ml-config\` index.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-datafeed`,
  methods: ['PUT'],
  patterns: ['_ml/datafeeds/{datafeed_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-datafeed',
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
      'headers',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_put_datafeed_request, 'body'),
    ...getShapeAt(ml_put_datafeed_request, 'path'),
    ...getShapeAt(ml_put_datafeed_request, 'query'),
  }),
  outputSchema: ml_put_datafeed_response,
};
