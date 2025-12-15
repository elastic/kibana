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
 * Source: /oas_docs/output/kibana.yaml, operations: BulkUpsertAssetCriticalityRecords
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  bulk_upsert_asset_criticality_records_request,
  bulk_upsert_asset_criticality_records_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const BULK_UPSERT_ASSET_CRITICALITY_RECORDS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.BulkUpsertAssetCriticalityRecords',
  summary: `Bulk upsert asset criticality records`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/asset_criticality/bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Bulk upsert up to 1000 asset criticality records.

If asset criticality records already exist for the specified entities, those records are overwritten with the specified values. If asset criticality records don't exist for the specified entities, new records are created.
`,
  methods: ['POST'],
  patterns: ['/api/asset_criticality/bulk'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-bulkupsertassetcriticalityrecords',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['records'],
  },
  paramsSchema: z.object({
    ...getShapeAt(bulk_upsert_asset_criticality_records_request, 'body'),
    ...getShapeAt(bulk_upsert_asset_criticality_records_request, 'path'),
    ...getShapeAt(bulk_upsert_asset_criticality_records_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: bulk_upsert_asset_criticality_records_response,
};
