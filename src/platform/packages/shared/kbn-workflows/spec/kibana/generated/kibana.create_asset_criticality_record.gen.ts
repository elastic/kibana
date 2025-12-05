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
 * Source: /oas_docs/output/kibana.yaml, operations: CreateAssetCriticalityRecord
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  create_asset_criticality_record_request,
  create_asset_criticality_record_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CREATE_ASSET_CRITICALITY_RECORD_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateAssetCriticalityRecord',
  summary: `Upsert an asset criticality record`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/asset_criticality</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create or update an asset criticality record for a specific entity.

If a record already exists for the specified entity, that record is overwritten with the specified value. If a record doesn't exist for the specified entity, a new record is created.
`,
  methods: ['POST'],
  patterns: ['/api/asset_criticality'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createassetcriticalityrecord',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(create_asset_criticality_record_request, 'body'),
    ...getShapeAt(create_asset_criticality_record_request, 'path'),
    ...getShapeAt(create_asset_criticality_record_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: create_asset_criticality_record_response,
};
