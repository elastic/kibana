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
 * Generated at: 2025-11-27T07:04:28.232Z
 * Source: elasticsearch-specification repository, operations: migration-get-feature-upgrade-status
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  migration_get_feature_upgrade_status_request,
  migration_get_feature_upgrade_status_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const MIGRATION_GET_FEATURE_UPGRADE_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.migration.get_feature_upgrade_status',
  connectorGroup: 'internal',
  summary: `Get feature migration information`,
  description: `Get feature migration information.

Version upgrades sometimes require changes to how features store configuration information and data in system indices.
Check which features need to be migrated and the status of any migrations that are in progress.

TIP: This API is designed for indirect use by the Upgrade Assistant.
You are strongly recommended to use the Upgrade Assistant.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-migration-get-feature-upgrade-status`,
  methods: ['GET'],
  patterns: ['_migration/system_features'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-migration-get-feature-upgrade-status',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(migration_get_feature_upgrade_status_request, 'body'),
    ...getShapeAt(migration_get_feature_upgrade_status_request, 'path'),
    ...getShapeAt(migration_get_feature_upgrade_status_request, 'query'),
  }),
  outputSchema: migration_get_feature_upgrade_status_response,
};
