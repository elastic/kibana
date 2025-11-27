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
 * Generated at: 2025-11-27T07:43:24.892Z
 * Source: elasticsearch-specification repository, operations: ingest-delete-pipeline
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ingest_delete_pipeline_request,
  ingest_delete_pipeline_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INGEST_DELETE_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.delete_pipeline',
  connectorGroup: 'internal',
  summary: `Delete pipelines`,
  description: `Delete pipelines.

Delete one or more ingest pipelines.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-delete-pipeline`,
  methods: ['DELETE'],
  patterns: ['_ingest/pipeline/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-delete-pipeline',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ingest_delete_pipeline_request, 'body'),
    ...getShapeAt(ingest_delete_pipeline_request, 'path'),
    ...getShapeAt(ingest_delete_pipeline_request, 'query'),
  }),
  outputSchema: ingest_delete_pipeline_response,
};
