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
 * Source: elasticsearch-specification repository, operations: indices-exists
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { indices_exists_request } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_EXISTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.exists',
  summary: `Check indices`,
  description: `Check indices.

Check if one or more indices, index aliases, or data streams exist.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-exists`,
  methods: ['HEAD'],
  patterns: ['{index}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-exists',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'flat_settings',
      'ignore_unavailable',
      'include_defaults',
      'local',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_exists_request, 'body'),
    ...getShapeAt(indices_exists_request, 'path'),
    ...getShapeAt(indices_exists_request, 'query'),
  }),
  outputSchema: z.optional(z.looseObject({})),
};
