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
 * Generated at: 2025-11-27T07:43:24.855Z
 * Source: elasticsearch-specification repository, operations: cat-help
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { cat_help_request, cat_help_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_HELP_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.help',
  connectorGroup: 'internal',
  summary: `Get CAT help`,
  description: `Get CAT help.

Get help for the CAT APIs.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-cat`,
  methods: ['GET'],
  patterns: ['_cat'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-cat',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(cat_help_request, 'body'),
    ...getShapeAt(cat_help_request, 'path'),
    ...getShapeAt(cat_help_request, 'query'),
  }),
  outputSchema: cat_help_response,
};
