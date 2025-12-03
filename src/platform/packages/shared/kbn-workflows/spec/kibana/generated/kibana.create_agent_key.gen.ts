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
 * Source: /oas_docs/output/kibana.yaml, operations: createAgentKey
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  create_agent_key_request,
  create_agent_key_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CREATE_AGENT_KEY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createAgentKey',
  summary: `Create an APM agent key`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/agent_keys</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new agent key for APM.
The user creating an APM agent API key must have at least the \`manage_own_api_key\` cluster privilege and the APM application-level privileges that it wishes to grant.
After it is created, you can copy the API key (Base64 encoded) and use it to to authorize requests from APM agents to the APM Server.
`,
  methods: ['POST'],
  patterns: ['/api/apm/agent_keys'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createagentkey',
  parameterTypes: {
    headerParams: ['elastic-api-version', 'kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['name', 'privileges'],
  },
  paramsSchema: z.object({
    ...getShapeAt(create_agent_key_request, 'body'),
    ...getShapeAt(create_agent_key_request, 'path'),
    ...getShapeAt(create_agent_key_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: create_agent_key_response,
};
