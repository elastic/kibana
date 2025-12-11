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
 * Source: elasticsearch-specification repository, operations: slm-start
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { slm_start_request, slm_start_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SLM_START_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.slm.start',
  summary: `Start snapshot lifecycle management`,
  description: `Start snapshot lifecycle management.

Snapshot lifecycle management (SLM) starts automatically when a cluster is formed.
Manually starting SLM is necessary only if it has been stopped using the stop SLM API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-start`,
  methods: ['POST'],
  patterns: ['_slm/start'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-start',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(slm_start_request, 'body'),
    ...getShapeAt(slm_start_request, 'path'),
    ...getShapeAt(slm_start_request, 'query'),
  }),
  outputSchema: slm_start_response,
};
