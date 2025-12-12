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
 * Source: /oas_docs/output/kibana.yaml, operations: FindAssetCriticalityRecords
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  find_asset_criticality_records_request,
  find_asset_criticality_records_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const FIND_ASSET_CRITICALITY_RECORDS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindAssetCriticalityRecords',
  summary: `List asset criticality records`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/asset_criticality/list</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

List asset criticality records, paging, sorting and filtering as needed.`,
  methods: ['GET'],
  patterns: ['/api/asset_criticality/list'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findassetcriticalityrecords',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['sort_field', 'sort_direction', 'page', 'per_page', 'kuery'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(find_asset_criticality_records_request, 'body'),
    ...getShapeAt(find_asset_criticality_records_request, 'path'),
    ...getShapeAt(find_asset_criticality_records_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: find_asset_criticality_records_response,
};
