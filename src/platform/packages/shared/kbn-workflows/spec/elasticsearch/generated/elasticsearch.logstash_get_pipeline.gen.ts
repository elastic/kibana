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
 * Source: elasticsearch-specification repository, operations: logstash-get-pipeline, logstash-get-pipeline-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  logstash_get_pipeline1_request,
  logstash_get_pipeline1_response,
  logstash_get_pipeline_request,
  logstash_get_pipeline_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const LOGSTASH_GET_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.logstash.get_pipeline',
  summary: `Get Logstash pipelines`,
  description: `Get Logstash pipelines.

Get pipelines that are used for Logstash Central Management.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-logstash-get-pipeline`,
  methods: ['GET'],
  patterns: ['_logstash/pipeline', '_logstash/pipeline/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-logstash-get-pipeline',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(logstash_get_pipeline_request, 'body'),
      ...getShapeAt(logstash_get_pipeline_request, 'path'),
      ...getShapeAt(logstash_get_pipeline_request, 'query'),
    }),
    z.object({
      ...getShapeAt(logstash_get_pipeline1_request, 'body'),
      ...getShapeAt(logstash_get_pipeline1_request, 'path'),
      ...getShapeAt(logstash_get_pipeline1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([logstash_get_pipeline_response, logstash_get_pipeline1_response]),
};
