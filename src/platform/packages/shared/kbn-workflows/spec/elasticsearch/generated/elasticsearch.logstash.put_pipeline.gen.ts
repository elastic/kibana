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
 * Generated at: 2025-11-27T07:43:24.894Z
 * Source: elasticsearch-specification repository, operations: logstash-put-pipeline
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { logstash_put_pipeline_request } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const LOGSTASH_PUT_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.logstash.put_pipeline',
  connectorGroup: 'internal',
  summary: `Create or update a Logstash pipeline`,
  description: `Create or update a Logstash pipeline.

Create a pipeline that is used for Logstash Central Management.
If the specified pipeline exists, it is replaced.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-logstash-put-pipeline`,
  methods: ['PUT'],
  patterns: ['_logstash/pipeline/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-logstash-put-pipeline',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [
      'description',
      'last_modified',
      'pipeline',
      'pipeline_metadata',
      'pipeline_settings',
      'username',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(logstash_put_pipeline_request, 'body'),
    ...getShapeAt(logstash_put_pipeline_request, 'path'),
    ...getShapeAt(logstash_put_pipeline_request, 'query'),
  }),
  outputSchema: z.optional(z.looseObject({})),
};
