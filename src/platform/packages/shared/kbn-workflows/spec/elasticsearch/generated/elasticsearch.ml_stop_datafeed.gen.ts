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
 * Source: elasticsearch-specification repository, operations: ml-stop-datafeed
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_stop_datafeed_request, ml_stop_datafeed_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_STOP_DATAFEED_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.stop_datafeed',
  summary: `Stop datafeeds`,
  description: `Stop datafeeds.

A datafeed that is stopped ceases to retrieve data from Elasticsearch. A datafeed can be started and stopped
multiple times throughout its lifecycle.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-stop-datafeed`,
  methods: ['POST'],
  patterns: ['_ml/datafeeds/{datafeed_id}/_stop'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-stop-datafeed',
  parameterTypes: {
    headerParams: [],
    pathParams: ['datafeed_id'],
    urlParams: ['allow_no_match', 'force', 'timeout'],
    bodyParams: ['allow_no_match', 'force', 'timeout'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_stop_datafeed_request, 'body'),
    ...getShapeAt(ml_stop_datafeed_request, 'path'),
    ...getShapeAt(ml_stop_datafeed_request, 'query'),
  }),
  outputSchema: ml_stop_datafeed_response,
};
