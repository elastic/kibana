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
 * Source: elasticsearch-specification repository, operations: logstash-delete-pipeline
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { logstash_delete_pipeline_request } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const LOGSTASH_DELETE_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.logstash.delete_pipeline',
  summary: `Delete a Logstash pipeline`,
  description: `Delete a Logstash pipeline.

Delete a pipeline that is used for Logstash Central Management.
If the request succeeds, you receive an empty response with an appropriate status code.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-logstash-delete-pipeline`,
  methods: ['DELETE'],
  patterns: ['_logstash/pipeline/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-logstash-delete-pipeline',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(logstash_delete_pipeline_request, 'body'),
    ...getShapeAt(logstash_delete_pipeline_request, 'path'),
    ...getShapeAt(logstash_delete_pipeline_request, 'query'),
  }),
  outputSchema: z.optional(z.looseObject({})),
};
