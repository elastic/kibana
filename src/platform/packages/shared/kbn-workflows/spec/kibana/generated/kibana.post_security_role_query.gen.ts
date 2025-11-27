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
 * Source: /oas_docs/output/kibana.yaml, operations: post-security-role-query
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';
import type { InternalConnectorContract } from '../../../types/latest';

import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import { post_security_role_query_request } from './schemas/kibana_openapi_zod.gen';
import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_SECURITY_ROLE_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_security_role_query',
  connectorGroup: 'internal',
  summary: `Query roles`,
  description: null,
  methods: ['POST'],
  patterns: ['/api/security/role/_query'],
  documentation: null,
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['filters', 'from', 'query', 'size', 'sort'],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_security_role_query_request, 'body'),
    ...getShapeAt(post_security_role_query_request, 'path'),
    ...getShapeAt(post_security_role_query_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
