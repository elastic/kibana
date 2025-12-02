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
 * Source: /oas_docs/output/kibana.yaml, operations: FinalizeAlertsMigration
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  finalize_alerts_migration_request,
  finalize_alerts_migration_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const FINALIZE_ALERTS_MIGRATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FinalizeAlertsMigration',
  summary: `Finalize detection alert migrations`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/finalize_migration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Finalize successful migrations of detection alerts. This replaces the original index's alias with the successfully migrated index's alias.
The endpoint is idempotent; therefore, it can safely be used to poll a given migration and, upon completion,
finalize it.
`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/signals/finalize_migration'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-finalizealertsmigration',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['migration_ids'],
  },
  paramsSchema: z.object({
    ...getShapeAt(finalize_alerts_migration_request, 'body'),
    ...getShapeAt(finalize_alerts_migration_request, 'path'),
    ...getShapeAt(finalize_alerts_migration_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: finalize_alerts_migration_response,
};
