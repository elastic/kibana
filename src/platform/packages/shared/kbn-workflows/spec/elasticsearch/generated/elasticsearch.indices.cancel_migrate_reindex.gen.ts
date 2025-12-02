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
 * Source: elasticsearch-specification repository, operations: indices-cancel-migrate-reindex
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_cancel_migrate_reindex_request,
  indices_cancel_migrate_reindex_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_CANCEL_MIGRATE_REINDEX_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.cancel_migrate_reindex',
  summary: `Cancel a migration reindex operation`,
  description: `Cancel a migration reindex operation.

Cancel a migration reindex attempt for a data stream or index.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-cancel-migrate-reindex`,
  methods: ['POST'],
  patterns: ['_migration/reindex/{index}/_cancel'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-cancel-migrate-reindex',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_cancel_migrate_reindex_request, 'body'),
    ...getShapeAt(indices_cancel_migrate_reindex_request, 'path'),
    ...getShapeAt(indices_cancel_migrate_reindex_request, 'query'),
  }),
  outputSchema: indices_cancel_migrate_reindex_response,
};
