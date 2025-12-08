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
 * Source: /oas_docs/output/kibana.yaml, operations: EndpointSuspendProcessAction
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  endpoint_suspend_process_action_request,
  endpoint_suspend_process_action_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const ENDPOINT_SUSPEND_PROCESS_ACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointSuspendProcessAction',
  summary: `Suspend a process`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/suspend_process</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Suspend a running process on an endpoint.`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/suspend_process'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointsuspendprocessaction',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(endpoint_suspend_process_action_request, 'body'),
    ...getShapeAt(endpoint_suspend_process_action_request, 'path'),
    ...getShapeAt(endpoint_suspend_process_action_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: endpoint_suspend_process_action_response,
};
