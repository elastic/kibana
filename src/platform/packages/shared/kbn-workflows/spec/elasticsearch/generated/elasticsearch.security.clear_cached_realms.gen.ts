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
 * Source: elasticsearch-specification repository, operations: security-clear-cached-realms
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_clear_cached_realms_request,
  security_clear_cached_realms_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_CLEAR_CACHED_REALMS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.clear_cached_realms',
  summary: `Clear the user cache`,
  description: `Clear the user cache.

Evict users from the user cache.
You can completely clear the cache or evict specific users.

User credentials are cached in memory on each node to avoid connecting to a remote authentication service or hitting the disk for every incoming request.
There are realm settings that you can use to configure the user cache.
For more information, refer to the documentation about controlling the user cache.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-clear-cached-realms`,
  methods: ['POST'],
  patterns: ['_security/realm/{realms}/_clear_cache'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-clear-cached-realms',
  parameterTypes: {
    headerParams: [],
    pathParams: ['realms'],
    urlParams: ['usernames'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_clear_cached_realms_request, 'body'),
    ...getShapeAt(security_clear_cached_realms_request, 'path'),
    ...getShapeAt(security_clear_cached_realms_request, 'query'),
  }),
  outputSchema: security_clear_cached_realms_response,
};
