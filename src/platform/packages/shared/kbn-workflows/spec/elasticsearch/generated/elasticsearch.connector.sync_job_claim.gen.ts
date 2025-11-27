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
 * Source: elasticsearch-specification repository, operations: connector-sync-job-claim
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  connector_sync_job_claim_request,
  connector_sync_job_claim_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CONNECTOR_SYNC_JOB_CLAIM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.sync_job_claim',
  connectorGroup: 'internal',
  summary: `Claim a connector sync job`,
  description: `Claim a connector sync job.

This action updates the job status to \`in_progress\` and sets the \`last_seen\` and \`started_at\` timestamps to the current time.
Additionally, it can set the \`sync_cursor\` property for the sync job.

This API is not intended for direct connector management by users.
It supports the implementation of services that utilize the connector protocol to communicate with Elasticsearch.

To sync data using self-managed connectors, you need to deploy the Elastic connector service on your own infrastructure.
This service runs automatically on Elastic Cloud for Elastic managed connectors.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-claim`,
  methods: ['PUT'],
  patterns: ['_connector/_sync_job/{connector_sync_job_id}/_claim'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-claim',
  parameterTypes: {
    headerParams: [],
    pathParams: ['connector_sync_job_id'],
    urlParams: [],
    bodyParams: ['sync_cursor', 'worker_hostname'],
  },
  paramsSchema: z.object({
    ...getShapeAt(connector_sync_job_claim_request, 'body'),
    ...getShapeAt(connector_sync_job_claim_request, 'path'),
    ...getShapeAt(connector_sync_job_claim_request, 'query'),
  }),
  outputSchema: connector_sync_job_claim_response,
};
