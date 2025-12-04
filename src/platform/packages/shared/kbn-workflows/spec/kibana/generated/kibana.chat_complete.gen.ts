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
 * Source: /oas_docs/output/kibana.yaml, operations: ChatComplete
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { chat_complete_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CHAT_COMPLETE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ChatComplete',
  summary: `Create a model response`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/chat/complete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a model response for the given chat conversation.`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/chat/complete'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-chatcomplete',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['content_references_disabled'],
    bodyParams: [
      'connectorId',
      'conversationId',
      'isStream',
      'langSmithApiKey',
      'langSmithProject',
      'messages',
      'model',
      'persist',
      'promptId',
      'responseLanguage',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(chat_complete_request, 'body'),
    ...getShapeAt(chat_complete_request, 'path'),
    ...getShapeAt(chat_complete_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
