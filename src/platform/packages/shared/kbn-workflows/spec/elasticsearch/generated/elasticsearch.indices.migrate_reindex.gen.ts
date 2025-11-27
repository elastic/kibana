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
 * Generated at: 2025-11-27T07:43:24.879Z
 * Source: elasticsearch-specification repository, operations: indices-migrate-reindex
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_migrate_reindex_request,
  indices_migrate_reindex_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_MIGRATE_REINDEX_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.migrate_reindex',
  connectorGroup: 'internal',
  summary: `Reindex legacy backing indices`,
  description: `Reindex legacy backing indices.

Reindex all legacy backing indices for a data stream.
This operation occurs in a persistent task.
The persistent task ID is returned immediately and the reindexing work is completed in that task.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-migrate-reindex`,
  methods: ['POST'],
  patterns: ['_migration/reindex'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-migrate-reindex',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['mode', 'source'],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_migrate_reindex_request, 'body'),
    ...getShapeAt(indices_migrate_reindex_request, 'path'),
    ...getShapeAt(indices_migrate_reindex_request, 'query'),
  }),
  outputSchema: indices_migrate_reindex_response,
};
