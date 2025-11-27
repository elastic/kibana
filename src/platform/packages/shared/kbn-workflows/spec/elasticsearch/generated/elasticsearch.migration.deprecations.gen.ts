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
 * Source: elasticsearch-specification repository, operations: migration-deprecations, migration-deprecations-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  migration_deprecations1_request,
  migration_deprecations1_response,
  migration_deprecations_request,
  migration_deprecations_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const MIGRATION_DEPRECATIONS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.migration.deprecations',
  connectorGroup: 'internal',
  summary: `Get deprecation information`,
  description: `Get deprecation information.

Get information about different cluster, node, and index level settings that use deprecated features that will be removed or changed in the next major version.

TIP: This APIs is designed for indirect use by the Upgrade Assistant.
You are strongly recommended to use the Upgrade Assistant.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-migration-deprecations`,
  methods: ['GET'],
  patterns: ['_migration/deprecations', '{index}/_migration/deprecations'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-migration-deprecations',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(migration_deprecations_request, 'body'),
      ...getShapeAt(migration_deprecations_request, 'path'),
      ...getShapeAt(migration_deprecations_request, 'query'),
    }),
    z.object({
      ...getShapeAt(migration_deprecations1_request, 'body'),
      ...getShapeAt(migration_deprecations1_request, 'path'),
      ...getShapeAt(migration_deprecations1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([migration_deprecations_response, migration_deprecations1_response]),
};
