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
 * Generated at: 2025-11-27T07:43:24.862Z
 * Source: elasticsearch-specification repository, operations:
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import type { InternalConnectorContract } from '../../../types/latest';

// import all needed request and response schemas generated from the OpenAPI spec
import {} from './es_openapi_zod.gen';

// export contract
export const CONNECTOR_LAST_SYNC_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.last_sync',
  connectorGroup: 'internal',
  summary: null,
  description: `Update the connector last sync stats.

Update the fields related to the last sync of a connector.
This action is used for analytics and monitoring.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-last-sync`,
  methods: ['PUT'],
  patterns: ['_connector/{connector_id}/_last_sync'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-last-sync',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.object({})),
  outputSchema: z.optional(z.looseObject({})),
};
