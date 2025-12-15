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
 * Source: elasticsearch-specification repository, operations: inference-put-voyageai
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  inference_put_voyageai_request,
  inference_put_voyageai_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_PUT_VOYAGEAI_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_voyageai',
  summary: `Create a VoyageAI inference endpoint`,
  description: `Create a VoyageAI inference endpoint.

Create an inference endpoint to perform an inference task with the \`voyageai\` service.

Avoid creating multiple endpoints for the same model unless required, as each endpoint consumes significant resources.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-voyageai`,
  methods: ['PUT'],
  patterns: ['_inference/{task_type}/{voyageai_inference_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-voyageai',
  parameterTypes: {
    headerParams: [],
    pathParams: ['task_type', 'voyageai_inference_id'],
    urlParams: ['timeout'],
    bodyParams: ['chunking_settings', 'service', 'service_settings', 'task_settings'],
  },
  paramsSchema: z.object({
    ...getShapeAt(inference_put_voyageai_request, 'body'),
    ...getShapeAt(inference_put_voyageai_request, 'path'),
    ...getShapeAt(inference_put_voyageai_request, 'query'),
  }),
  outputSchema: inference_put_voyageai_response,
};
