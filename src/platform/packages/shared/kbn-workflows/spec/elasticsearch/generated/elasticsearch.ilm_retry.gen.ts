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
 * Source: elasticsearch-specification repository, operations: ilm-retry
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ilm_retry_request, ilm_retry_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ILM_RETRY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.retry',
  summary: `Retry a policy`,
  description: `Retry a policy.

Retry running the lifecycle policy for an index that is in the ERROR step.
The API sets the policy back to the step where the error occurred and runs the step.
Use the explain lifecycle state API to determine whether an index is in the ERROR step.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-retry`,
  methods: ['POST'],
  patterns: ['{index}/_ilm/retry'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-retry',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ilm_retry_request, 'body'),
    ...getShapeAt(ilm_retry_request, 'path'),
    ...getShapeAt(ilm_retry_request, 'query'),
  }),
  outputSchema: ilm_retry_response,
};
