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
 * Source: /oas_docs/output/kibana.yaml, operations: post-actions-connector-id-execute
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  post_actions_connector_id_execute_request,
  post_actions_connector_id_execute_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_ACTIONS_CONNECTOR_ID_EXECUTE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_actions_connector_id_execute',
  summary: `Run a connector`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/actions/connector/{id}/_execute</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You can use this API to test an action that involves interaction with Kibana services or integrations with third-party systems.`,
  methods: ['POST'],
  patterns: ['/api/actions/connector/{id}/_execute'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['params'],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_actions_connector_id_execute_request, 'body'),
    ...getShapeAt(post_actions_connector_id_execute_request, 'path'),
    ...getShapeAt(post_actions_connector_id_execute_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: post_actions_connector_id_execute_response,
};
