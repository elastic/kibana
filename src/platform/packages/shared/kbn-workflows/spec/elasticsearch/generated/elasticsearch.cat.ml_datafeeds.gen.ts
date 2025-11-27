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
 * Generated at: 2025-11-27T07:04:28.184Z
 * Source: elasticsearch-specification repository, operations: cat-ml-datafeeds, cat-ml-datafeeds-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cat_ml_datafeeds1_request,
  cat_ml_datafeeds1_response,
  cat_ml_datafeeds_request,
  cat_ml_datafeeds_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_ML_DATAFEEDS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.ml_datafeeds',
  connectorGroup: 'internal',
  summary: `Get datafeeds`,
  description: `Get datafeeds.

Get configuration and usage information about datafeeds.
This API returns a maximum of 10,000 datafeeds.
If the Elasticsearch security features are enabled, you must have \`monitor_ml\`, \`monitor\`, \`manage_ml\`, or \`manage\`
cluster privileges to use this API.

IMPORTANT: CAT APIs are only intended for human consumption using the Kibana
console or command line. They are not intended for use by applications. For
application consumption, use the get datafeed statistics API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-ml-datafeeds`,
  methods: ['GET'],
  patterns: ['_cat/ml/datafeeds', '_cat/ml/datafeeds/{datafeed_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-ml-datafeeds',
  parameterTypes: {
    headerParams: [],
    pathParams: ['datafeed_id'],
    urlParams: ['allow_no_match', 'h', 's'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cat_ml_datafeeds_request, 'body'),
      ...getShapeAt(cat_ml_datafeeds_request, 'path'),
      ...getShapeAt(cat_ml_datafeeds_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cat_ml_datafeeds1_request, 'body'),
      ...getShapeAt(cat_ml_datafeeds1_request, 'path'),
      ...getShapeAt(cat_ml_datafeeds1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cat_ml_datafeeds_response, cat_ml_datafeeds1_response]),
};
