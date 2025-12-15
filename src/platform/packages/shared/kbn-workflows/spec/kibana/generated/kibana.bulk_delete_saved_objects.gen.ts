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
 * Source: /oas_docs/output/kibana.yaml, operations: bulkDeleteSavedObjects
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  bulk_delete_saved_objects_request,
  bulk_delete_saved_objects_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const BULK_DELETE_SAVED_OBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkDeleteSavedObjects',
  summary: `Delete saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_bulk_delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

WARNING: When you delete a saved object, it cannot be recovered.
`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_bulk_delete'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-bulkdeletesavedobjects',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: ['force'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(bulk_delete_saved_objects_request, 'body'),
    ...getShapeAt(bulk_delete_saved_objects_request, 'path'),
    ...getShapeAt(bulk_delete_saved_objects_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: bulk_delete_saved_objects_response,
};
