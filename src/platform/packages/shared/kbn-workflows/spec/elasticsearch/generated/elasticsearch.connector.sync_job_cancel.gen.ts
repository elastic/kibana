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
 * Generated at: 2025-11-27T07:43:24.863Z
 * Source: elasticsearch-specification repository, operations: connector-sync-job-cancel
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  connector_sync_job_cancel_request,
  connector_sync_job_cancel_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CONNECTOR_SYNC_JOB_CANCEL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.sync_job_cancel',
  connectorGroup: 'internal',
  summary: `Cancel a connector sync job`,
  description: `Cancel a connector sync job.

Cancel a connector sync job, which sets the status to cancelling and updates \`cancellation_requested_at\` to the current time.
The connector service is then responsible for setting the status of connector sync jobs to cancelled.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-cancel`,
  methods: ['PUT'],
  patterns: ['_connector/_sync_job/{connector_sync_job_id}/_cancel'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-cancel',
  parameterTypes: {
    headerParams: [],
    pathParams: ['connector_sync_job_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(connector_sync_job_cancel_request, 'body'),
    ...getShapeAt(connector_sync_job_cancel_request, 'path'),
    ...getShapeAt(connector_sync_job_cancel_request, 'query'),
  }),
  outputSchema: connector_sync_job_cancel_response,
};
