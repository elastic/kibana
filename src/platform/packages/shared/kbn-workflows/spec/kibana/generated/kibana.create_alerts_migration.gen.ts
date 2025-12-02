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
 * Source: /oas_docs/output/kibana.yaml, operations: CreateAlertsMigration
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  create_alerts_migration_request,
  create_alerts_migration_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CREATE_ALERTS_MIGRATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateAlertsMigration',
  summary: `Initiate a detection alert migration`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/migration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Initiate a migration of detection alerts.
Migrations are initiated per index. While the process is neither destructive nor interferes with existing data, it may be resource-intensive. As such, it is recommended that you plan your migrations accordingly.
`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/signals/migration'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createalertsmigration',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(create_alerts_migration_request, 'body'),
    ...getShapeAt(create_alerts_migration_request, 'path'),
    ...getShapeAt(create_alerts_migration_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: create_alerts_migration_response,
};
