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
 * Source: /oas_docs/output/kibana.yaml, operations: post-security-session-invalidate
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  post_security_session_invalidate_request,
  post_security_session_invalidate_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_SECURITY_SESSION_INVALIDATE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_security_session_invalidate',
  summary: `Invalidate user sessions`,
  description: `Invalidate user sessions that match a query. To use this API, you must be a superuser.
`,
  methods: ['POST'],
  patterns: ['/api/security/session/_invalidate'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-security-session-invalidate',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['match', 'query'],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_security_session_invalidate_request, 'body'),
    ...getShapeAt(post_security_session_invalidate_request, 'path'),
    ...getShapeAt(post_security_session_invalidate_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: post_security_session_invalidate_response,
};
