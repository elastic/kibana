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
 * Source: /oas_docs/output/kibana.yaml, operations: ReadEndpointListItem
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  read_endpoint_list_item_request,
  read_endpoint_list_item_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const READ_ENDPOINT_LIST_ITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadEndpointListItem',
  summary: `Get an Elastic Endpoint rule exception list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an Elastic Endpoint exception list item, specified by the \`id\` or \`item_id\` field.`,
  methods: ['GET'],
  patterns: ['/api/endpoint_list/items'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readendpointlistitem',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'item_id'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(read_endpoint_list_item_request, 'body'),
    ...getShapeAt(read_endpoint_list_item_request, 'path'),
    ...getShapeAt(read_endpoint_list_item_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: read_endpoint_list_item_response,
};
