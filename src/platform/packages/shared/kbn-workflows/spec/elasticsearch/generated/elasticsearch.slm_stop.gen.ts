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
 * Source: elasticsearch-specification repository, operations: slm-stop
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { slm_stop_request, slm_stop_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SLM_STOP_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.slm.stop',
  summary: `Stop snapshot lifecycle management`,
  description: `Stop snapshot lifecycle management.

Stop all snapshot lifecycle management (SLM) operations and the SLM plugin.
This API is useful when you are performing maintenance on a cluster and need to prevent SLM from performing any actions on your data streams or indices.
Stopping SLM does not stop any snapshots that are in progress.
You can manually trigger snapshots with the run snapshot lifecycle policy API even if SLM is stopped.

The API returns a response as soon as the request is acknowledged, but the plugin might continue to run until in-progress operations complete and it can be safely stopped.
Use the get snapshot lifecycle management status API to see if SLM is running.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-stop`,
  methods: ['POST'],
  patterns: ['_slm/stop'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-stop',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(slm_stop_request, 'body'),
    ...getShapeAt(slm_stop_request, 'path'),
    ...getShapeAt(slm_stop_request, 'query'),
  }),
  outputSchema: slm_stop_response,
};
