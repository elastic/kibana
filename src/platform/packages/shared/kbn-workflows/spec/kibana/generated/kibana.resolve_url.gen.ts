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
 * Source: /oas_docs/output/kibana.yaml, operations: resolve-url
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { resolve_url_request, resolve_url_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const RESOLVE_URL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.resolve_url',
  summary: `Resolve a short URL`,
  description: `Resolve a Kibana short URL by its slug.
`,
  methods: ['GET'],
  patterns: ['/api/short_url/_slug/{slug}'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-resolve-url',
  parameterTypes: {
    headerParams: [],
    pathParams: ['slug'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(resolve_url_request, 'body'),
    ...getShapeAt(resolve_url_request, 'path'),
    ...getShapeAt(resolve_url_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: resolve_url_response,
};
