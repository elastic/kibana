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
 * Source: elasticsearch-specification repository, operations: inference-inference, inference-inference-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  inference_inference1_request,
  inference_inference1_response,
  inference_inference_request,
  inference_inference_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_INFERENCE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.inference',
  summary: `Perform inference on the service`,
  description: `Perform inference on the service.

This API enables you to use machine learning models to perform specific tasks on data that you provide as an input.
It returns a response with the results of the tasks.
The inference endpoint you use can perform one specific task that has been defined when the endpoint was created with the create inference API.

For details about using this API with a service, such as Amazon Bedrock, Anthropic, or HuggingFace, refer to the service-specific documentation.

> info
> The inference APIs enable you to use certain services, such as built-in machine learning models (ELSER, E5), models uploaded through Eland, Cohere, OpenAI, Azure, Google AI Studio, Google Vertex AI, Anthropic, Watsonx.ai, or Hugging Face. For built-in models and models uploaded through Eland, the inference APIs offer an alternative way to use and manage trained models. However, if you do not plan to use the inference APIs to use these models or if you want to use non-NLP models, use the machine learning trained model APIs.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-inference`,
  methods: ['POST'],
  patterns: ['_inference/{inference_id}', '_inference/{task_type}/{inference_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-inference',
  parameterTypes: {
    headerParams: [],
    pathParams: ['inference_id', 'task_type'],
    urlParams: ['timeout'],
    bodyParams: ['query', 'input', 'input_type', 'task_settings'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(inference_inference_request, 'body'),
      ...getShapeAt(inference_inference_request, 'path'),
      ...getShapeAt(inference_inference_request, 'query'),
    }),
    z.object({
      ...getShapeAt(inference_inference1_request, 'body'),
      ...getShapeAt(inference_inference1_request, 'path'),
      ...getShapeAt(inference_inference1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([inference_inference_response, inference_inference1_response]),
};
