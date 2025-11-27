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
 * Source: elasticsearch-specification repository, operations: connector-sync-job-post
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  connector_sync_job_post_request,
  connector_sync_job_post_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CONNECTOR_SYNC_JOB_POST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.sync_job_post',
  connectorGroup: 'internal',
  summary: `Create a connector sync job`,
  description: `Create a connector sync job.

Create a connector sync job document in the internal index and initialize its counters and timestamps with default values.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-post`,
  methods: ['POST'],
  patterns: ['_connector/_sync_job'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-sync-job-post',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['id', 'job_type', 'trigger_method'],
  },
  paramsSchema: z.object({
    ...getShapeAt(connector_sync_job_post_request, 'body'),
    ...getShapeAt(connector_sync_job_post_request, 'path'),
    ...getShapeAt(connector_sync_job_post_request, 'query'),
  }),
  outputSchema: connector_sync_job_post_response,
};
