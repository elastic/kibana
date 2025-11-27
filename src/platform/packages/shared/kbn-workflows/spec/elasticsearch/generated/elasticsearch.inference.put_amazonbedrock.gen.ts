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
 * Generated at: 2025-11-27T07:04:28.227Z
 * Source: elasticsearch-specification repository, operations: inference-put-amazonbedrock
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  inference_put_amazonbedrock_request,
  inference_put_amazonbedrock_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_PUT_AMAZONBEDROCK_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_amazonbedrock',
  connectorGroup: 'internal',
  summary: `Create an Amazon Bedrock inference endpoint`,
  description: `Create an Amazon Bedrock inference endpoint.

Create an inference endpoint to perform an inference task with the \`amazonbedrock\` service.

>info
> You need to provide the access and secret keys only once, during the inference model creation. The get inference API does not retrieve your access or secret keys. After creating the inference model, you cannot change the associated key pairs. If you want to use a different access and secret key pair, delete the inference model and recreate it with the same name and the updated keys.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-amazonbedrock`,
  methods: ['PUT'],
  patterns: ['_inference/{task_type}/{amazonbedrock_inference_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-amazonbedrock',
  parameterTypes: {
    headerParams: [],
    pathParams: ['task_type', 'amazonbedrock_inference_id'],
    urlParams: ['timeout'],
    bodyParams: ['chunking_settings', 'service', 'service_settings', 'task_settings'],
  },
  paramsSchema: z.object({
    ...getShapeAt(inference_put_amazonbedrock_request, 'body'),
    ...getShapeAt(inference_put_amazonbedrock_request, 'path'),
    ...getShapeAt(inference_put_amazonbedrock_request, 'query'),
  }),
  outputSchema: inference_put_amazonbedrock_response,
};
