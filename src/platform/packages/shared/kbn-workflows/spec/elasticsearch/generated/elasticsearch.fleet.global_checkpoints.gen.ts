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
 * Generated at: 2025-11-27T07:04:28.210Z
 * Source: elasticsearch-specification repository, operations: fleet-global-checkpoints
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  fleet_global_checkpoints_request,
  fleet_global_checkpoints_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const FLEET_GLOBAL_CHECKPOINTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.fleet.global_checkpoints',
  connectorGroup: 'internal',
  summary: `Get global checkpoints`,
  description: `Get global checkpoints.

Get the current global checkpoints for an index.
This API is designed for internal use by the Fleet server project.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-fleet`,
  methods: ['GET'],
  patterns: ['{index}/_fleet/global_checkpoints'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-fleet',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['wait_for_advance', 'wait_for_index', 'checkpoints', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(fleet_global_checkpoints_request, 'body'),
    ...getShapeAt(fleet_global_checkpoints_request, 'path'),
    ...getShapeAt(fleet_global_checkpoints_request, 'query'),
  }),
  outputSchema: fleet_global_checkpoints_response,
};
