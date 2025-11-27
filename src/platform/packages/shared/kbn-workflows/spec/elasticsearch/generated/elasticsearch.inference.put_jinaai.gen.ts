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
 * Generated at: 2025-11-27T07:04:28.229Z
 * Source: elasticsearch-specification repository, operations: inference-put-jinaai
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { inference_put_jinaai_request, inference_put_jinaai_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_PUT_JINAAI_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_jinaai',
  connectorGroup: 'internal',
  summary: `Create an JinaAI inference endpoint`,
  description: `Create an JinaAI inference endpoint.

Create an inference endpoint to perform an inference task with the \`jinaai\` service.

To review the available \`rerank\` models, refer to <https://jina.ai/reranker>.
To review the available \`text_embedding\` models, refer to the <https://jina.ai/embeddings/>.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-jinaai`,
  methods: ['PUT'],
  patterns: ['_inference/{task_type}/{jinaai_inference_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-jinaai',
  parameterTypes: {
    headerParams: [],
    pathParams: ['task_type', 'jinaai_inference_id'],
    urlParams: ['timeout'],
    bodyParams: ['chunking_settings', 'service', 'service_settings', 'task_settings'],
  },
  paramsSchema: z.object({
    ...getShapeAt(inference_put_jinaai_request, 'body'),
    ...getShapeAt(inference_put_jinaai_request, 'path'),
    ...getShapeAt(inference_put_jinaai_request, 'query'),
  }),
  outputSchema: inference_put_jinaai_response,
};
