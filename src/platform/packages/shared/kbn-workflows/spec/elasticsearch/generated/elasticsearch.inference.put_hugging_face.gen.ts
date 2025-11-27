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
 * Generated at: 2025-11-27T07:04:28.228Z
 * Source: elasticsearch-specification repository, operations: inference-put-hugging-face
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  inference_put_hugging_face_request,
  inference_put_hugging_face_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_PUT_HUGGING_FACE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_hugging_face',
  connectorGroup: 'internal',
  summary: `Create a Hugging Face inference endpoint`,
  description: `Create a Hugging Face inference endpoint.

Create an inference endpoint to perform an inference task with the \`hugging_face\` service.
Supported tasks include: \`text_embedding\`, \`completion\`, and \`chat_completion\`.

To configure the endpoint, first visit the Hugging Face Inference Endpoints page and create a new endpoint.
Select a model that supports the task you intend to use.

For Elastic's \`text_embedding\` task:
The selected model must support the \`Sentence Embeddings\` task. On the new endpoint creation page, select the \`Sentence Embeddings\` task under the \`Advanced Configuration\` section.
After the endpoint has initialized, copy the generated endpoint URL.
Recommended models for \`text_embedding\` task:

* \`all-MiniLM-L6-v2\`
* \`all-MiniLM-L12-v2\`
* \`all-mpnet-base-v2\`
* \`e5-base-v2\`
* \`e5-small-v2\`
* \`multilingual-e5-base\`
* \`multilingual-e5-small\`

For Elastic's \`chat_completion\` and \`completion\` tasks:
The selected model must support the \`Text Generation\` task and expose OpenAI API. HuggingFace supports both serverless and dedicated endpoints for \`Text Generation\`. When creating dedicated endpoint select the \`Text Generation\` task.
After the endpoint is initialized (for dedicated) or ready (for serverless), ensure it supports the OpenAI API and includes \`/v1/chat/completions\` part in URL. Then, copy the full endpoint URL for use.
Recommended models for \`chat_completion\` and \`completion\` tasks:

* \`Mistral-7B-Instruct-v0.2\`
* \`QwQ-32B\`
* \`Phi-3-mini-128k-instruct\`

For Elastic's \`rerank\` task:
The selected model must support the \`sentence-ranking\` task and expose OpenAI API.
HuggingFace supports only dedicated (not serverless) endpoints for \`Rerank\` so far.
After the endpoint is initialized, copy the full endpoint URL for use.
Tested models for \`rerank\` task:

* \`bge-reranker-base\`
* \`jina-reranker-v1-turbo-en-GGUF\`

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-hugging-face`,
  methods: ['PUT'],
  patterns: ['_inference/{task_type}/{huggingface_inference_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-hugging-face',
  parameterTypes: {
    headerParams: [],
    pathParams: ['task_type', 'huggingface_inference_id'],
    urlParams: ['timeout'],
    bodyParams: ['chunking_settings', 'service', 'service_settings', 'task_settings'],
  },
  paramsSchema: z.object({
    ...getShapeAt(inference_put_hugging_face_request, 'body'),
    ...getShapeAt(inference_put_hugging_face_request, 'path'),
    ...getShapeAt(inference_put_hugging_face_request, 'query'),
  }),
  outputSchema: inference_put_hugging_face_response,
};
