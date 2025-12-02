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
 * Source: /oas_docs/output/kibana.yaml, operations: UpdateEndpointListItem
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  update_endpoint_list_item_request,
  update_endpoint_list_item_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const UPDATE_ENDPOINT_LIST_ITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateEndpointListItem',
  summary: `Update an Elastic Endpoint rule exception list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint_list/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an Elastic Endpoint exception list item, specified by the \`id\` or \`item_id\` field.`,
  methods: ['PUT'],
  patterns: ['/api/endpoint_list/items'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updateendpointlistitem',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      '_version',
      'comments',
      'description',
      'entries',
      'id',
      'item_id',
      'meta',
      'name',
      'os_types',
      'tags',
      'type',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(update_endpoint_list_item_request, 'body'),
    ...getShapeAt(update_endpoint_list_item_request, 'path'),
    ...getShapeAt(update_endpoint_list_item_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: update_endpoint_list_item_response,
};
