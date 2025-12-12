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
 * Source: /oas_docs/output/kibana.yaml, operations: delete-synthetic-monitors
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  delete_synthetic_monitors_request,
  delete_synthetic_monitors_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const DELETE_SYNTHETIC_MONITORS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_synthetic_monitors',
  summary: `Delete monitors`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors/_bulk_delete</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete multiple monitors by sending a list of config IDs.
`,
  methods: ['POST'],
  patterns: ['/api/synthetics/monitors/_bulk_delete'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete-synthetic-monitors',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['ids'],
  },
  paramsSchema: z.object({
    ...getShapeAt(delete_synthetic_monitors_request, 'body'),
    ...getShapeAt(delete_synthetic_monitors_request, 'path'),
    ...getShapeAt(delete_synthetic_monitors_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: delete_synthetic_monitors_response,
};
