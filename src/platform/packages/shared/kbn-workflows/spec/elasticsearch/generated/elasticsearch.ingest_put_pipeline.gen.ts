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
 * Source: elasticsearch-specification repository, operations: ingest-put-pipeline
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ingest_put_pipeline_request,
  ingest_put_pipeline_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INGEST_PUT_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.put_pipeline',
  summary: `Create or update a pipeline`,
  description: `Create or update a pipeline.

Changes made using this API take effect immediately.

 Documentation: https://www.elastic.co/docs/manage-data/ingest/transform-enrich/ingest-pipelines`,
  methods: ['PUT'],
  patterns: ['_ingest/pipeline/{id}'],
  documentation: 'https://www.elastic.co/docs/manage-data/ingest/transform-enrich/ingest-pipelines',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['master_timeout', 'timeout', 'if_version'],
    bodyParams: [
      '_meta',
      'description',
      'on_failure',
      'processors',
      'version',
      'deprecated',
      'field_access_pattern',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(ingest_put_pipeline_request, 'body'),
    ...getShapeAt(ingest_put_pipeline_request, 'path'),
    ...getShapeAt(ingest_put_pipeline_request, 'query'),
  }),
  outputSchema: ingest_put_pipeline_response,
};
