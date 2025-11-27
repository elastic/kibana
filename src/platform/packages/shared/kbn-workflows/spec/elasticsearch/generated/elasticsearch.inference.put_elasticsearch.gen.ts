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
 * Generated at: 2025-11-27T07:43:24.889Z
 * Source: elasticsearch-specification repository, operations: inference-put-elasticsearch
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  inference_put_elasticsearch_request,
  inference_put_elasticsearch_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_PUT_ELASTICSEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_elasticsearch',
  connectorGroup: 'internal',
  summary: `Create an Elasticsearch inference endpoint`,
  description: `Create an Elasticsearch inference endpoint.

Create an inference endpoint to perform an inference task with the \`elasticsearch\` service.

> info
> Your Elasticsearch deployment contains preconfigured ELSER and E5 inference endpoints, you only need to create the enpoints using the API if you want to customize the settings.

If you use the ELSER or the E5 model through the \`elasticsearch\` service, the API request will automatically download and deploy the model if it isn't downloaded yet.

> info
> You might see a 502 bad gateway error in the response when using the Kibana Console. This error usually just reflects a timeout, while the model downloads in the background. You can check the download progress in the Machine Learning UI. If using the Python client, you can set the timeout parameter to a higher value.

After creating the endpoint, wait for the model deployment to complete before using it.
To verify the deployment status, use the get trained model statistics API.
Look for \`"state": "fully_allocated"\` in the response and ensure that the \`"allocation_count"\` matches the \`"target_allocation_count"\`.
Avoid creating multiple endpoints for the same model unless required, as each endpoint consumes significant resources.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-elasticsearch`,
  methods: ['PUT'],
  patterns: ['_inference/{task_type}/{elasticsearch_inference_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-elasticsearch',
  parameterTypes: {
    headerParams: [],
    pathParams: ['task_type', 'elasticsearch_inference_id'],
    urlParams: ['timeout'],
    bodyParams: ['chunking_settings', 'service', 'service_settings', 'task_settings'],
  },
  paramsSchema: z.object({
    ...getShapeAt(inference_put_elasticsearch_request, 'body'),
    ...getShapeAt(inference_put_elasticsearch_request, 'path'),
    ...getShapeAt(inference_put_elasticsearch_request, 'query'),
  }),
  outputSchema: inference_put_elasticsearch_response,
};
