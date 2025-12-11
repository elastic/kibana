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
 * Source: elasticsearch-specification repository, operations: ingest-get-pipeline, ingest-get-pipeline-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ingest_get_pipeline1_request,
  ingest_get_pipeline1_response,
  ingest_get_pipeline_request,
  ingest_get_pipeline_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INGEST_GET_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.get_pipeline',
  summary: `Get pipelines`,
  description: `Get pipelines.

Get information about one or more ingest pipelines.
This API returns a local reference of the pipeline.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-get-pipeline`,
  methods: ['GET'],
  patterns: ['_ingest/pipeline', '_ingest/pipeline/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-get-pipeline',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['master_timeout', 'summary'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ingest_get_pipeline_request, 'body'),
      ...getShapeAt(ingest_get_pipeline_request, 'path'),
      ...getShapeAt(ingest_get_pipeline_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ingest_get_pipeline1_request, 'body'),
      ...getShapeAt(ingest_get_pipeline1_request, 'path'),
      ...getShapeAt(ingest_get_pipeline1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([ingest_get_pipeline_response, ingest_get_pipeline1_response]),
};
