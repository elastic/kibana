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
 * Generated at: 2025-11-27T07:04:28.212Z
 * Source: elasticsearch-specification repository, operations: ilm-start
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ilm_start_request, ilm_start_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ILM_START_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.start',
  connectorGroup: 'internal',
  summary: `Start the ILM plugin`,
  description: `Start the ILM plugin.

Start the index lifecycle management plugin if it is currently stopped.
ILM is started automatically when the cluster is formed.
Restarting ILM is necessary only when it has been stopped using the stop ILM API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-start`,
  methods: ['POST'],
  patterns: ['_ilm/start'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-start',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ilm_start_request, 'body'),
    ...getShapeAt(ilm_start_request, 'path'),
    ...getShapeAt(ilm_start_request, 'query'),
  }),
  outputSchema: ilm_start_response,
};
