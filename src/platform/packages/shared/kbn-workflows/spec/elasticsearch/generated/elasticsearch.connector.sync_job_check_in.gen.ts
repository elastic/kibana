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
 * Source: elasticsearch-specification repository, operations: connector-sync-job-check-in
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  connector_sync_job_check_in_request,
  connector_sync_job_check_in_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CONNECTOR_SYNC_JOB_CHECK_IN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.sync_job_check_in',
  connectorGroup: 'internal',
  summary: `Check in a connector sync job`,
  description: `Check in a connector sync job.

Check in a connector sync job and set the \`last_seen\` field to the current time before updating it in the internal index.

To sync data using self-managed connectors, you need to deploy the Elastic connector service on your own infrastructure.
This service runs automatically on Elastic Cloud for Elastic managed connectors.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-check-in`,
  methods: ['PUT'],
  patterns: ['_connector/_sync_job/{connector_sync_job_id}/_check_in'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-check-in',
  parameterTypes: {
    headerParams: [],
    pathParams: ['connector_sync_job_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(connector_sync_job_check_in_request, 'body'),
    ...getShapeAt(connector_sync_job_check_in_request, 'path'),
    ...getShapeAt(connector_sync_job_check_in_request, 'query'),
  }),
  outputSchema: connector_sync_job_check_in_response,
};
