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
 * Generated at: 2025-11-27T07:43:24.878Z
 * Source: elasticsearch-specification repository, operations: indices-get-migrate-reindex-status
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_get_migrate_reindex_status_request,
  indices_get_migrate_reindex_status_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_GET_MIGRATE_REINDEX_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_migrate_reindex_status',
  connectorGroup: 'internal',
  summary: `Get the migration reindexing status`,
  description: `Get the migration reindexing status.

Get the status of a migration reindex attempt for a data stream or index.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-migration`,
  methods: ['GET'],
  patterns: ['_migration/reindex/{index}/_status'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-migration',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_get_migrate_reindex_status_request, 'body'),
    ...getShapeAt(indices_get_migrate_reindex_status_request, 'path'),
    ...getShapeAt(indices_get_migrate_reindex_status_request, 'query'),
  }),
  outputSchema: indices_get_migrate_reindex_status_response,
};
