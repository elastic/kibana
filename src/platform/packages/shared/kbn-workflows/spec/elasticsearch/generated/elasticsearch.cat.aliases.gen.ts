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
 * Generated at: 2025-11-27T07:43:24.854Z
 * Source: elasticsearch-specification repository, operations: cat-aliases, cat-aliases-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cat_aliases1_request,
  cat_aliases1_response,
  cat_aliases_request,
  cat_aliases_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_ALIASES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.aliases',
  connectorGroup: 'internal',
  summary: `Get aliases`,
  description: `Get aliases.

Get the cluster's index aliases, including filter and routing information.
This API does not return data stream aliases.

IMPORTANT: CAT APIs are only intended for human consumption using the command line or the Kibana console. They are not intended for use by applications. For application consumption, use the aliases API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-aliases`,
  methods: ['GET'],
  patterns: ['_cat/aliases', '_cat/aliases/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-aliases',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['h', 's', 'expand_wildcards', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cat_aliases_request, 'body'),
      ...getShapeAt(cat_aliases_request, 'path'),
      ...getShapeAt(cat_aliases_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cat_aliases1_request, 'body'),
      ...getShapeAt(cat_aliases1_request, 'path'),
      ...getShapeAt(cat_aliases1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cat_aliases_response, cat_aliases1_response]),
};
