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
 * Source: /oas_docs/output/kibana.yaml, operations: CreateConversation
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  create_conversation_request,
  create_conversation_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CREATE_CONVERSATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateConversation',
  summary: `Create a conversation`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new Security AI Assistant conversation. This endpoint allows the user to initiate a conversation with the Security AI Assistant by providing the required parameters.`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/current_user/conversations'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createconversation',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'apiConfig',
      'category',
      'excludeFromLastConversationStorage',
      'id',
      'messages',
      'replacements',
      'title',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(create_conversation_request, 'body'),
    ...getShapeAt(create_conversation_request, 'path'),
    ...getShapeAt(create_conversation_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: create_conversation_response,
};
