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
 * Generated at: 2025-11-27T07:43:24.894Z
 * Source: elasticsearch-specification repository, operations: migration-post-feature-upgrade
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  migration_post_feature_upgrade_request,
  migration_post_feature_upgrade_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const MIGRATION_POST_FEATURE_UPGRADE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.migration.post_feature_upgrade',
  connectorGroup: 'internal',
  summary: `Start the feature migration`,
  description: `Start the feature migration.

Version upgrades sometimes require changes to how features store configuration information and data in system indices.
This API starts the automatic migration process.

Some functionality might be temporarily unavailable during the migration process.

TIP: The API is designed for indirect use by the Upgrade Assistant. We strongly recommend you use the Upgrade Assistant.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-migration-get-feature-upgrade-status`,
  methods: ['POST'],
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
    ...getShapeAt(migration_post_feature_upgrade_request, 'body'),
    ...getShapeAt(migration_post_feature_upgrade_request, 'path'),
    ...getShapeAt(migration_post_feature_upgrade_request, 'query'),
  }),
  outputSchema: migration_post_feature_upgrade_response,
};
