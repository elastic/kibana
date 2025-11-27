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
 * Source: /oas_docs/output/kibana.yaml, operations: UpdateConversation
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';
import type { InternalConnectorContract } from '../../../types/latest';

import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import {
  update_conversation_request,
  update_conversation_response,
} from './schemas/kibana_openapi_zod.gen';
import { FetcherConfigSchema } from '../../schema';

// export contract
export const UPDATECONVERSATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateConversation',
  connectorGroup: 'internal',
  summary: `Update a conversation`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/current_user/conversations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing conversation using the conversation ID. This endpoint allows users to modify the details of an existing conversation.`,
  methods: ['PUT'],
  patterns: ['/api/security_ai_assistant/current_user/conversations/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [
      'apiConfig',
      'category',
      'excludeFromLastConversationStorage',
      'id',
      'messages',
      'replacements',
      'title',
      'users',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(update_conversation_request, 'body'),
    ...getShapeAt(update_conversation_request, 'path'),
    ...getShapeAt(update_conversation_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: update_conversation_response,
};
