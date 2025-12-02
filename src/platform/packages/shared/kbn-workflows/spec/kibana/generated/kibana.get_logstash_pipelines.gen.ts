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
 * Source: /oas_docs/output/kibana.yaml, operations: get-logstash-pipelines
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  get_logstash_pipelines_request,
  get_logstash_pipelines_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const GET_LOGSTASH_PIPELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_logstash_pipelines',
  summary: `Get all Logstash pipelines`,
  description: `Get a list of all centrally-managed Logstash pipelines.

To use this API, you must have either the \`logstash_admin\` built-in role or a customized Logstash reader role.
> info
> Limit the number of pipelines to 10,000 or fewer. As the number of pipelines nears and surpasses 10,000, you may see performance issues on Kibana.

The \`username\` property appears in the response when security is enabled and depends on when the pipeline was created or last updated.
`,
  methods: ['GET'],
  patterns: ['/api/logstash/pipelines'],
  documentation: 'https://www.elastic.co/docs/reference/logstash/secure-connection',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(get_logstash_pipelines_request, 'body'),
    ...getShapeAt(get_logstash_pipelines_request, 'path'),
    ...getShapeAt(get_logstash_pipelines_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: get_logstash_pipelines_response,
};
