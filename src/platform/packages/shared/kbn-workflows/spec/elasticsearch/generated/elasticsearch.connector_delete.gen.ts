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
 * Source: elasticsearch-specification repository, operations: connector-delete
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { connector_delete_request, connector_delete_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CONNECTOR_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.delete',
  summary: `Delete a connector`,
  description: `Delete a connector.

Removes a connector and associated sync jobs.
This is a destructive action that is not recoverable.
NOTE: This action doesn’t delete any API keys, ingest pipelines, or data indices associated with the connector.
These need to be removed manually.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-delete`,
  methods: ['DELETE'],
  patterns: ['_connector/{connector_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-delete',
  parameterTypes: {
    headerParams: [],
    pathParams: ['connector_id'],
    urlParams: ['delete_sync_jobs', 'hard'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(connector_delete_request, 'body'),
    ...getShapeAt(connector_delete_request, 'path'),
    ...getShapeAt(connector_delete_request, 'query'),
  }),
  outputSchema: connector_delete_response,
};
