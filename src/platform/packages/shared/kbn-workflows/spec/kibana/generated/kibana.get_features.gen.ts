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
 * Source: /oas_docs/output/kibana.yaml, operations: get-features
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { get_features_request, get_features_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const GET_FEATURES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_features',
  summary: `Get features`,
  description: `Get information about all Kibana features. Features are used by spaces and security to refine and secure access to Kibana.
`,
  methods: ['GET'],
  patterns: ['/api/features'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-features',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(get_features_request, 'body'),
    ...getShapeAt(get_features_request, 'path'),
    ...getShapeAt(get_features_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: get_features_response,
};
