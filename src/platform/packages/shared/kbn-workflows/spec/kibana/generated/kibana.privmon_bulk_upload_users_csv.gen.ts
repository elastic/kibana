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
 * Source: /oas_docs/output/kibana.yaml, operations: PrivmonBulkUploadUsersCSV
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  privmon_bulk_upload_users_csv_request,
  privmon_bulk_upload_users_csv_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PRIVMON_BULK_UPLOAD_USERS_CSV_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PrivmonBulkUploadUsersCSV',
  summary: `Upsert multiple monitored users via CSV upload`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/entity_analytics/monitoring/users/_csv</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/entity_analytics/monitoring/users/_csv'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-privmonbulkuploaduserscsv',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(privmon_bulk_upload_users_csv_request, 'body'),
    ...getShapeAt(privmon_bulk_upload_users_csv_request, 'path'),
    ...getShapeAt(privmon_bulk_upload_users_csv_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: privmon_bulk_upload_users_csv_response,
};
