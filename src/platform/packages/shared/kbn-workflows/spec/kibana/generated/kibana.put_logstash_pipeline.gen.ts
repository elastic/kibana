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
 * Source: /oas_docs/output/kibana.yaml, operations: put-logstash-pipeline
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { put_logstash_pipeline_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PUT_LOGSTASH_PIPELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_logstash_pipeline',
  summary: `Create or update a Logstash pipeline`,
  description: `Create a centrally-managed Logstash pipeline or update a pipeline.
To use this API, you must have either the \`logstash_admin\` built-in role or a customized Logstash writer role.
`,
  methods: ['PUT'],
  patterns: ['/api/logstash/pipeline/{id}'],
  documentation: 'https://www.elastic.co/docs/reference/logstash/secure-connection',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['description', 'pipeline', 'settings'],
  },
  paramsSchema: z.object({
    ...getShapeAt(put_logstash_pipeline_request, 'body'),
    ...getShapeAt(put_logstash_pipeline_request, 'path'),
    ...getShapeAt(put_logstash_pipeline_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
