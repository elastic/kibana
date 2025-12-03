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
 * Source: /oas_docs/output/kibana.yaml, operations: ReadConversation
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  read_conversation_request,
  read_conversation_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const READ_CONVERSATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadConversation',
  summary: `Get a conversation`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an existing conversation using the conversation ID. This allows users to fetch the specific conversation data by its unique ID.`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/current_user/conversations/{id}'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readconversation',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(read_conversation_request, 'body'),
    ...getShapeAt(read_conversation_request, 'path'),
    ...getShapeAt(read_conversation_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: read_conversation_response,
};
