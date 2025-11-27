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
 * Source: elasticsearch-specification repository, operations: inference-put-elser
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { inference_put_elser_request, inference_put_elser_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_PUT_ELSER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_elser',
  connectorGroup: 'internal',
  summary: `Create an ELSER inference endpoint`,
  description: `Create an ELSER inference endpoint.

Create an inference endpoint to perform an inference task with the \`elser\` service.
You can also deploy ELSER by using the Elasticsearch inference integration.

> info
> Your Elasticsearch deployment contains a preconfigured ELSER inference endpoint, you only need to create the enpoint using the API if you want to customize the settings.

The API request will automatically download and deploy the ELSER model if it isn't already downloaded.

> info
> You might see a 502 bad gateway error in the response when using the Kibana Console. This error usually just reflects a timeout, while the model downloads in the background. You can check the download progress in the Machine Learning UI. If using the Python client, you can set the timeout parameter to a higher value.

After creating the endpoint, wait for the model deployment to complete before using it.
To verify the deployment status, use the get trained model statistics API.
Look for \`"state": "fully_allocated"\` in the response and ensure that the \`"allocation_count"\` matches the \`"target_allocation_count"\`.
Avoid creating multiple endpoints for the same model unless required, as each endpoint consumes significant resources.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-elser`,
  methods: ['PUT'],
  patterns: ['_inference/{task_type}/{elser_inference_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-elser',
  parameterTypes: {
    headerParams: [],
    pathParams: ['task_type', 'elser_inference_id'],
    urlParams: ['timeout'],
    bodyParams: ['chunking_settings', 'service', 'service_settings'],
  },
  paramsSchema: z.object({
    ...getShapeAt(inference_put_elser_request, 'body'),
    ...getShapeAt(inference_put_elser_request, 'path'),
    ...getShapeAt(inference_put_elser_request, 'query'),
  }),
  outputSchema: inference_put_elser_response,
};
