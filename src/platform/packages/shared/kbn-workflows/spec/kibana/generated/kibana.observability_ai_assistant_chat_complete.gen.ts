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
 * Source: /oas_docs/output/kibana.yaml, operations: observability-ai-assistant-chat-complete
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  observability_ai_assistant_chat_complete_request,
  observability_ai_assistant_chat_complete_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const OBSERVABILITY_AI_ASSISTANT_CHAT_COMPLETE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.observability_ai_assistant_chat_complete',
  summary: `Generate a chat completion`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/observability_ai_assistant/chat/complete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a new chat completion by using the Observability AI Assistant. 

The API returns the model's response based on the current conversation context. 

It also handles any tool requests within the conversation, which may trigger multiple calls to the underlying large language model (LLM). 

This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.
`,
  methods: ['POST'],
  patterns: ['/api/observability_ai_assistant/chat/complete'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-observability-ai-assistant-chat-complete',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'actions',
      'connectorId',
      'conversationId',
      'disableFunctions',
      'instructions',
      'messages',
      'persist',
      'title',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(observability_ai_assistant_chat_complete_request, 'body'),
    ...getShapeAt(observability_ai_assistant_chat_complete_request, 'path'),
    ...getShapeAt(observability_ai_assistant_chat_complete_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: observability_ai_assistant_chat_complete_response,
};
