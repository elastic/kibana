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
 * Generated at: 2025-11-27T07:04:28.202Z
 * Source: elasticsearch-specification repository, operations: connector-sync-job-delete
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  connector_sync_job_delete_request,
  connector_sync_job_delete_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CONNECTOR_SYNC_JOB_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.sync_job_delete',
  connectorGroup: 'internal',
  summary: `Delete a connector sync job`,
  description: `Delete a connector sync job.

Remove a connector sync job and its associated data.
This is a destructive action that is not recoverable.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-delete`,
  methods: ['DELETE'],
  patterns: ['_connector/_sync_job/{connector_sync_job_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-delete',
  parameterTypes: {
    headerParams: [],
    pathParams: ['connector_sync_job_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(connector_sync_job_delete_request, 'body'),
    ...getShapeAt(connector_sync_job_delete_request, 'path'),
    ...getShapeAt(connector_sync_job_delete_request, 'query'),
  }),
  outputSchema: connector_sync_job_delete_response,
};
