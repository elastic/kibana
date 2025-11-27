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
 * Generated at: 2025-11-27T07:04:28.226Z
 * Source: elasticsearch-specification repository, operations: indices-update-aliases
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_update_aliases_request,
  indices_update_aliases_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_UPDATE_ALIASES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.update_aliases',
  connectorGroup: 'internal',
  summary: `Create or update an alias`,
  description: `Create or update an alias.

Adds a data stream or index to an alias.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-update-aliases`,
  methods: ['POST'],
  patterns: ['_aliases'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-update-aliases',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: ['actions'],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_update_aliases_request, 'body'),
    ...getShapeAt(indices_update_aliases_request, 'path'),
    ...getShapeAt(indices_update_aliases_request, 'query'),
  }),
  outputSchema: indices_update_aliases_response,
};
