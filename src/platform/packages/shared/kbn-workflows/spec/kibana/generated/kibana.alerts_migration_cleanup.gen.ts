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
 * Source: /oas_docs/output/kibana.yaml, operations: AlertsMigrationCleanup
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  alerts_migration_cleanup_request,
  alerts_migration_cleanup_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const ALERTS_MIGRATION_CLEANUP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.AlertsMigrationCleanup',
  summary: `Clean up detection alert migrations`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/migration</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Migrations favor data integrity over shard size. Consequently, unused or orphaned indices are artifacts of
the migration process. A successful migration will result in both the old and new indices being present.
As such, the old, orphaned index can (and likely should) be deleted.

While you can delete these indices manually,
the endpoint accomplishes this task by applying a deletion policy to the relevant index, causing it to be deleted
after 30 days. It also deletes other artifacts specific to the migration implementation.
`,
  methods: ['DELETE'],
  patterns: ['/api/detection_engine/signals/migration'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-alertsmigrationcleanup',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['migration_ids'],
  },
  paramsSchema: z.object({
    ...getShapeAt(alerts_migration_cleanup_request, 'body'),
    ...getShapeAt(alerts_migration_cleanup_request, 'path'),
    ...getShapeAt(alerts_migration_cleanup_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: alerts_migration_cleanup_response,
};
