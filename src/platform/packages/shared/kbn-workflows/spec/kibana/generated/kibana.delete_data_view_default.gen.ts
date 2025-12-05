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
 * Source: /oas_docs/output/kibana.yaml, operations: deleteDataViewDefault
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { delete_data_view_default_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const DELETE_DATA_VIEW_DEFAULT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteDataViewDefault',
  summary: `Delete a data view`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/data_views/data_view/{viewId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

WARNING: When you delete a data view, it cannot be recovered.
`,
  methods: ['DELETE'],
  patterns: ['/api/data_views/data_view/{viewId}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletedataviewdefault',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['viewId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(delete_data_view_default_request, 'body'),
    ...getShapeAt(delete_data_view_default_request, 'path'),
    ...getShapeAt(delete_data_view_default_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
