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
 * Source: /oas_docs/output/kibana.yaml, operations: CreateEndpointList
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  create_endpoint_list_request,
  create_endpoint_list_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CREATE_ENDPOINT_LIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateEndpointList',
  summary: `Create an Elastic Endpoint rule exception list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create the exception list for Elastic Endpoint rule exceptions. When you create the exception list, it will have a \`list_id\` of \`endpoint_list\`. If the Elastic Endpoint exception list already exists, your request will return an empty response.`,
  methods: ['POST'],
  patterns: ['/api/endpoint_list'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createendpointlist',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(create_endpoint_list_request, 'body'),
    ...getShapeAt(create_endpoint_list_request, 'path'),
    ...getShapeAt(create_endpoint_list_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: create_endpoint_list_response,
};
