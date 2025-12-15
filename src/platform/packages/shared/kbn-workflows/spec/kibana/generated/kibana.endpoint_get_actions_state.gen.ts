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
 * Source: /oas_docs/output/kibana.yaml, operations: EndpointGetActionsState
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  endpoint_get_actions_state_request,
  endpoint_get_actions_state_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const ENDPOINT_GET_ACTIONS_STATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointGetActionsState',
  summary: `Get actions state`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/state</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a response actions state, which reports whether encryption is enabled.`,
  methods: ['GET'],
  patterns: ['/api/endpoint/action/state'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointgetactionsstate',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(endpoint_get_actions_state_request, 'body'),
    ...getShapeAt(endpoint_get_actions_state_request, 'path'),
    ...getShapeAt(endpoint_get_actions_state_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: endpoint_get_actions_state_response,
};
