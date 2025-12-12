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
 * Source: elasticsearch-specification repository, operations: ilm-stop
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ilm_stop_request, ilm_stop_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ILM_STOP_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.stop',
  summary: `Stop the ILM plugin`,
  description: `Stop the ILM plugin.

Halt all lifecycle management operations and stop the index lifecycle management plugin.
This is useful when you are performing maintenance on the cluster and need to prevent ILM from performing any actions on your indices.

The API returns as soon as the stop request has been acknowledged, but the plugin might continue to run until in-progress operations complete and the plugin can be safely stopped.
Use the get ILM status API to check whether ILM is running.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-stop`,
  methods: ['POST'],
  patterns: ['_ilm/stop'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-stop',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ilm_stop_request, 'body'),
    ...getShapeAt(ilm_stop_request, 'path'),
    ...getShapeAt(ilm_stop_request, 'query'),
  }),
  outputSchema: ilm_stop_response,
};
