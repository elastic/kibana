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
 * Source: /oas_docs/output/kibana.yaml, operations: CancelAction
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { cancel_action_request, cancel_action_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CANCEL_ACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CancelAction',
  summary: `Cancel a response action`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/action/cancel</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Cancel a running or pending response action (Applies only to some agent types).`,
  methods: ['POST'],
  patterns: ['/api/endpoint/action/cancel'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-cancelaction',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(cancel_action_request, 'body'),
    ...getShapeAt(cancel_action_request, 'path'),
    ...getShapeAt(cancel_action_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: cancel_action_response,
};
