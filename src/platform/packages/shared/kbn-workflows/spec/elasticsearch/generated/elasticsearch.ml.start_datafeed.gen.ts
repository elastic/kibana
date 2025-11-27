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
 * Generated at: 2025-11-27T07:43:24.902Z
 * Source: elasticsearch-specification repository, operations: ml-start-datafeed
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_start_datafeed_request, ml_start_datafeed_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_START_DATAFEED_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.start_datafeed',
  connectorGroup: 'internal',
  summary: `Start datafeeds`,
  description: `Start datafeeds.

A datafeed must be started in order to retrieve data from Elasticsearch. A datafeed can be started and stopped
multiple times throughout its lifecycle.

Before you can start a datafeed, the anomaly detection job must be open. Otherwise, an error occurs.

If you restart a stopped datafeed, it continues processing input data from the next millisecond after it was stopped.
If new data was indexed for that exact millisecond between stopping and starting, it will be ignored.

When Elasticsearch security features are enabled, your datafeed remembers which roles the last user to create or
update it had at the time of creation or update and runs the query using those same roles. If you provided secondary
authorization headers when you created or updated the datafeed, those credentials are used instead.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-start-datafeed`,
  methods: ['POST'],
  patterns: ['_ml/datafeeds/{datafeed_id}/_start'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-start-datafeed',
  parameterTypes: {
    headerParams: [],
    pathParams: ['datafeed_id'],
    urlParams: ['end', 'start', 'timeout'],
    bodyParams: ['end', 'start', 'timeout'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_start_datafeed_request, 'body'),
    ...getShapeAt(ml_start_datafeed_request, 'path'),
    ...getShapeAt(ml_start_datafeed_request, 'query'),
  }),
  outputSchema: ml_start_datafeed_response,
};
