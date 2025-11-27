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
 * Generated at: 2025-11-27T07:04:28.226Z
 * Source: elasticsearch-specification repository, operations: inference-chat-completion-unified
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  inference_chat_completion_unified_request,
  inference_chat_completion_unified_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_CHAT_COMPLETION_UNIFIED_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.chat_completion_unified',
  connectorGroup: 'internal',
  summary: `Perform chat completion inference on the service`,
  description: `Perform chat completion inference on the service.

The chat completion inference API enables real-time responses for chat completion tasks by delivering answers incrementally, reducing response times during computation.
It only works with the \`chat_completion\` task type for \`openai\` and \`elastic\` inference services.

NOTE: The \`chat_completion\` task type is only available within the _stream API and only supports streaming.
The Chat completion inference API and the Stream inference API differ in their response structure and capabilities.
The Chat completion inference API provides more comprehensive customization options through more fields and function calling support.
If you use the \`openai\`, \`hugging_face\` or the \`elastic\` service, use the Chat completion inference API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-unified-inference`,
  methods: ['POST'],
  patterns: ['_inference/chat_completion/{inference_id}/_stream'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-unified-inference',
  parameterTypes: {
    headerParams: [],
    pathParams: ['inference_id'],
    urlParams: ['timeout'],
    bodyParams: [
      'messages',
      'model',
      'max_completion_tokens',
      'stop',
      'temperature',
      'tool_choice',
      'tools',
      'top_p',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(inference_chat_completion_unified_request, 'body'),
    ...getShapeAt(inference_chat_completion_unified_request, 'path'),
    ...getShapeAt(inference_chat_completion_unified_request, 'query'),
  }),
  outputSchema: inference_chat_completion_unified_response,
};
