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
 * Source: /oas_docs/output/kibana.yaml, operations: get-url
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';
import type { InternalConnectorContract } from '../../../types/latest';

import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import { get_url_request, get_url_response } from './schemas/kibana_openapi_zod.gen';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const GET_URL_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_url',
  connectorGroup: 'internal',
  summary: `Get a short URL`,
  description: `Get a single Kibana short URL.
`,
  methods: ['GET'],
  patterns: ['/api/short_url/{id}'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(get_url_request, 'body'),
    ...getShapeAt(get_url_request, 'path'),
    ...getShapeAt(get_url_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: get_url_response,
};
