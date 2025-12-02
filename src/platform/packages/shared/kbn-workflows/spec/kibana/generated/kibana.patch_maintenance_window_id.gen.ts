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
 * Source: /oas_docs/output/kibana.yaml, operations: patch-maintenance-window-id
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  patch_maintenance_window_id_request,
  patch_maintenance_window_id_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PATCH_MAINTENANCE_WINDOW_ID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.patch_maintenance_window_id',
  summary: `Update a maintenance window.`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: write-maintenance-window.`,
  methods: ['PATCH'],
  patterns: ['/api/maintenance_window/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-patch-maintenance-window-id',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['enabled', 'schedule', 'scope', 'title'],
  },
  paramsSchema: z.object({
    ...getShapeAt(patch_maintenance_window_id_request, 'body'),
    ...getShapeAt(patch_maintenance_window_id_request, 'path'),
    ...getShapeAt(patch_maintenance_window_id_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: patch_maintenance_window_id_response,
};
