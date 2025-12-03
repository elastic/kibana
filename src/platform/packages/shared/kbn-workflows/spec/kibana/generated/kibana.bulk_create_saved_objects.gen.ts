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
 * Source: /oas_docs/output/kibana.yaml, operations: bulkCreateSavedObjects
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  bulk_create_saved_objects_request,
  bulk_create_saved_objects_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const BULK_CREATE_SAVED_OBJECTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkCreateSavedObjects',
  summary: `Create saved objects`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/saved_objects/_bulk_create</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/saved_objects/_bulk_create'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-bulkcreatesavedobjects',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: ['overwrite'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(bulk_create_saved_objects_request, 'body'),
    ...getShapeAt(bulk_create_saved_objects_request, 'path'),
    ...getShapeAt(bulk_create_saved_objects_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: bulk_create_saved_objects_response,
};
