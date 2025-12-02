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
 * Source: /oas_docs/output/kibana.yaml, operations: FindExceptionListItems
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  find_exception_list_items_request,
  find_exception_list_items_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const FIND_EXCEPTION_LIST_ITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindExceptionListItems',
  summary: `Get exception list items`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/items/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all exception list items in the specified list.`,
  methods: ['GET'],
  patterns: ['/api/exception_lists/items/_find'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findexceptionlistitems',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'list_id',
      'filter',
      'namespace_type',
      'search',
      'page',
      'per_page',
      'sort_field',
      'sort_order',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(find_exception_list_items_request, 'body'),
    ...getShapeAt(find_exception_list_items_request, 'path'),
    ...getShapeAt(find_exception_list_items_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: find_exception_list_items_response,
};
