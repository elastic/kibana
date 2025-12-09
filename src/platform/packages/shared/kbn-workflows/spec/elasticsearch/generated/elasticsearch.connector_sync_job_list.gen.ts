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
 * Source: elasticsearch-specification repository, operations: connector-sync-job-list
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  connector_sync_job_list_request,
  connector_sync_job_list_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CONNECTOR_SYNC_JOB_LIST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.sync_job_list',
  summary: `Get all connector sync jobs`,
  description: `Get all connector sync jobs.

Get information about all stored connector sync jobs listed by their creation date in ascending order.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-list`,
  methods: ['GET'],
  patterns: ['_connector/_sync_job'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-list',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['from', 'size', 'status', 'connector_id', 'job_type'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(connector_sync_job_list_request, 'body'),
    ...getShapeAt(connector_sync_job_list_request, 'path'),
    ...getShapeAt(connector_sync_job_list_request, 'query'),
  }),
  outputSchema: connector_sync_job_list_response,
};
