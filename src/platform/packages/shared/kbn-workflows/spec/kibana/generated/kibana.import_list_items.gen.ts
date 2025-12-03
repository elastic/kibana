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
 * Source: /oas_docs/output/kibana.yaml, operations: ImportListItems
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  import_list_items_request,
  import_list_items_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const IMPORT_LIST_ITEMS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ImportListItems',
  summary: `Import value list items`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/lists/items/_import</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Import value list items from a TXT or CSV file. The maximum file size is 9 million bytes.

You can import items to a new or existing list.
`,
  methods: ['POST'],
  patterns: ['/api/lists/items/_import'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-importlistitems',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['list_id', 'type', 'serializer', 'deserializer', 'refresh'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(import_list_items_request, 'body'),
    ...getShapeAt(import_list_items_request, 'path'),
    ...getShapeAt(import_list_items_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: import_list_items_response,
};
