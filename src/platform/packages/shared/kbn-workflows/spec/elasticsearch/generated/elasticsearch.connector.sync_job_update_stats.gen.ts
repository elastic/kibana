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
 * Generated at: 2025-11-27T07:04:28.203Z
 * Source: elasticsearch-specification repository, operations: connector-sync-job-update-stats
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  connector_sync_job_update_stats_request,
  connector_sync_job_update_stats_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CONNECTOR_SYNC_JOB_UPDATE_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.sync_job_update_stats',
  connectorGroup: 'internal',
  summary: `Set the connector sync job stats`,
  description: `Set the connector sync job stats.

Stats include: \`deleted_document_count\`, \`indexed_document_count\`, \`indexed_document_volume\`, and \`total_document_count\`.
You can also update \`last_seen\`.
This API is mainly used by the connector service for updating sync job information.

To sync data using self-managed connectors, you need to deploy the Elastic connector service on your own infrastructure.
This service runs automatically on Elastic Cloud for Elastic managed connectors.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-update-stats`,
  methods: ['PUT'],
  patterns: ['_connector/_sync_job/{connector_sync_job_id}/_stats'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-update-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: ['connector_sync_job_id'],
    urlParams: [],
    bodyParams: [
      'deleted_document_count',
      'indexed_document_count',
      'indexed_document_volume',
      'last_seen',
      'metadata',
      'total_document_count',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(connector_sync_job_update_stats_request, 'body'),
    ...getShapeAt(connector_sync_job_update_stats_request, 'path'),
    ...getShapeAt(connector_sync_job_update_stats_request, 'query'),
  }),
  outputSchema: connector_sync_job_update_stats_response,
};
