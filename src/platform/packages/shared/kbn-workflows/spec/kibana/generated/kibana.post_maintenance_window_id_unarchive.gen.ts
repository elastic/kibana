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
 * Source: /oas_docs/output/kibana.yaml, operations: post-maintenance-window-id-unarchive
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  post_maintenance_window_id_unarchive_request,
  post_maintenance_window_id_unarchive_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_MAINTENANCE_WINDOW_ID_UNARCHIVE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_maintenance_window_id_unarchive',
  summary: `Unarchive a maintenance window.`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/maintenance_window/{id}/_unarchive</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

[Required authorization] Route required privileges: write-maintenance-window.`,
  methods: ['POST'],
  patterns: ['/api/maintenance_window/{id}/_unarchive'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-maintenance-window-id-unarchive',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_maintenance_window_id_unarchive_request, 'body'),
    ...getShapeAt(post_maintenance_window_id_unarchive_request, 'path'),
    ...getShapeAt(post_maintenance_window_id_unarchive_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: post_maintenance_window_id_unarchive_response,
};
