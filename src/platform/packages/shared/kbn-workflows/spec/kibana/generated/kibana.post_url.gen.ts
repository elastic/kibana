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
 * Source: /oas_docs/output/kibana.yaml, operations: post-url
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { post_url_request, post_url_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_URL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_url',
  summary: `Create a short URL`,
  description: `Kibana URLs may be long and cumbersome, short URLs are much easier to remember and share.
Short URLs are created by specifying the locator ID and locator parameters. When a short URL is resolved, the locator ID and locator parameters are used to redirect user to the right Kibana page.
`,
  methods: ['POST'],
  patterns: ['/api/short_url'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-url',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['humanReadableSlug', 'locatorId', 'params', 'slug'],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_url_request, 'body'),
    ...getShapeAt(post_url_request, 'path'),
    ...getShapeAt(post_url_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: post_url_response,
};
