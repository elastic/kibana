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
 * Source: /oas_docs/output/kibana.yaml, operations: ReadExceptionListItem
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';
import type { InternalConnectorContract } from '../../../types/latest';

import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import {
  read_exception_list_item_request,
  read_exception_list_item_response,
} from './schemas/kibana_openapi_zod.gen';
import { FetcherConfigSchema } from '../../schema';

// export contract
export const READEXCEPTIONLISTITEM_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadExceptionListItem',
  connectorGroup: 'internal',
  summary: `Get an exception list item`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/items</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an exception list item using the \`id\` or \`item_id\` field.`,
  methods: ['GET'],
  patterns: ['/api/exception_lists/items'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'item_id', 'namespace_type'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(read_exception_list_item_request, 'body'),
    ...getShapeAt(read_exception_list_item_request, 'path'),
    ...getShapeAt(read_exception_list_item_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: read_exception_list_item_response,
};
