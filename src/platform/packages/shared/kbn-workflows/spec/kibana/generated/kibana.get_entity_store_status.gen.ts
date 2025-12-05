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
 * Source: /oas_docs/output/kibana.yaml, operations: GetEntityStoreStatus
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  get_entity_store_status_request,
  get_entity_store_status_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const GET_ENTITY_STORE_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetEntityStoreStatus',
  summary: `Get the status of the Entity Store`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_store/status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/entity_store/status'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getentitystorestatus',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['include_components'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(get_entity_store_status_request, 'body'),
    ...getShapeAt(get_entity_store_status_request, 'path'),
    ...getShapeAt(get_entity_store_status_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: get_entity_store_status_response,
};
