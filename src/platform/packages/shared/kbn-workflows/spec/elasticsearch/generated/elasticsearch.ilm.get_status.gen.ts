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
 * Generated at: 2025-11-27T07:43:24.872Z
 * Source: elasticsearch-specification repository, operations: ilm-get-status
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ilm_get_status_request, ilm_get_status_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ILM_GET_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.get_status',
  connectorGroup: 'internal',
  summary: `Get the ILM status`,
  description: `Get the ILM status.

Get the current index lifecycle management status.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-get-status`,
  methods: ['GET'],
  patterns: ['_ilm/status'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-get-status',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ilm_get_status_request, 'body'),
    ...getShapeAt(ilm_get_status_request, 'path'),
    ...getShapeAt(ilm_get_status_request, 'query'),
  }),
  outputSchema: ilm_get_status_response,
};
