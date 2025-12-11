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
 * Source: elasticsearch-specification repository, operations: inference-stream-completion
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  inference_stream_completion_request,
  inference_stream_completion_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_STREAM_COMPLETION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.stream_completion',
  summary: `Perform streaming completion inference on the service`,
  description: `Perform streaming completion inference on the service.

Get real-time responses for completion tasks by delivering answers incrementally, reducing response times during computation.
This API works only with the completion task type.

IMPORTANT: The inference APIs enable you to use certain services, such as built-in machine learning models (ELSER, E5), models uploaded through Eland, Cohere, OpenAI, Azure, Google AI Studio, Google Vertex AI, Anthropic, Watsonx.ai, or Hugging Face. For built-in models and models uploaded through Eland, the inference APIs offer an alternative way to use and manage trained models. However, if you do not plan to use the inference APIs to use these models or if you want to use non-NLP models, use the machine learning trained model APIs.

This API requires the \`monitor_inference\` cluster privilege (the built-in \`inference_admin\` and \`inference_user\` roles grant this privilege). You must use a client that supports streaming.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-stream-inference`,
  methods: ['POST'],
  patterns: ['_inference/completion/{inference_id}/_stream'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-stream-inference',
  parameterTypes: {
    headerParams: [],
    pathParams: ['inference_id'],
    urlParams: ['timeout'],
    bodyParams: ['input', 'task_settings'],
  },
  paramsSchema: z.object({
    ...getShapeAt(inference_stream_completion_request, 'body'),
    ...getShapeAt(inference_stream_completion_request, 'path'),
    ...getShapeAt(inference_stream_completion_request, 'query'),
  }),
  outputSchema: inference_stream_completion_response,
};
