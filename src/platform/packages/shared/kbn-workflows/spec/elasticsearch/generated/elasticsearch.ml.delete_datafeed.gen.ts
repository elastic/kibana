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
 * Generated at: 2025-11-27T07:04:28.233Z
 * Source: elasticsearch-specification repository, operations: ml-delete-datafeed
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_delete_datafeed_request, ml_delete_datafeed_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_DELETE_DATAFEED_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_datafeed',
  connectorGroup: 'internal',
  summary: `Delete a datafeed`,
  description: `Delete a datafeed.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-datafeed`,
  methods: ['DELETE'],
  patterns: ['_ml/datafeeds/{datafeed_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-datafeed',
  parameterTypes: {
    headerParams: [],
    pathParams: ['datafeed_id'],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_delete_datafeed_request, 'body'),
    ...getShapeAt(ml_delete_datafeed_request, 'path'),
    ...getShapeAt(ml_delete_datafeed_request, 'query'),
  }),
  outputSchema: ml_delete_datafeed_response,
};
