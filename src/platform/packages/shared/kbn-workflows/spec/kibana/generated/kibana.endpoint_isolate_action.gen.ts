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
 * Source: /oas_docs/output/kibana.yaml, operations: EndpointIsolateAction
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  endpoint_isolate_action_request,
  endpoint_isolate_action_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const ENDPOINT_ISOLATE_ACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointIsolateAction',
  summary: `Isolate an endpoint`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/isolate</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Isolate an endpoint from the network. The endpoint remains isolated until it's released.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/isolate'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointisolateaction',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['agent_type', 'alert_ids', 'case_ids', 'comment', 'endpoint_ids', 'parameters'],
  },
  paramsSchema: z.object({
    ...getShapeAt(endpoint_isolate_action_request, 'body'),
    ...getShapeAt(endpoint_isolate_action_request, 'path'),
    ...getShapeAt(endpoint_isolate_action_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: endpoint_isolate_action_response,
};
