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
 * Generated at: 2025-11-27T07:04:28.239Z
 * Source: elasticsearch-specification repository, operations: ml-update-filter
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_update_filter_request, ml_update_filter_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_UPDATE_FILTER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.update_filter',
  connectorGroup: 'internal',
  summary: `Update a filter`,
  description: `Update a filter.

Updates the description of a filter, adds items, or removes items from the list.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-filter`,
  methods: ['POST'],
  patterns: ['_ml/filters/{filter_id}/_update'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-filter',
  parameterTypes: {
    headerParams: [],
    pathParams: ['filter_id'],
    urlParams: [],
    bodyParams: ['add_items', 'description', 'remove_items'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_update_filter_request, 'body'),
    ...getShapeAt(ml_update_filter_request, 'path'),
    ...getShapeAt(ml_update_filter_request, 'query'),
  }),
  outputSchema: ml_update_filter_response,
};
