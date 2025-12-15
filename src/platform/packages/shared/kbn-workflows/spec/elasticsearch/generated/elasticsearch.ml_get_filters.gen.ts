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
 * Source: elasticsearch-specification repository, operations: ml-get-filters, ml-get-filters-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_get_filters1_request,
  ml_get_filters1_response,
  ml_get_filters_request,
  ml_get_filters_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_GET_FILTERS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_filters',
  summary: `Get filters`,
  description: `Get filters.

You can get a single filter or all filters.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-filters`,
  methods: ['GET'],
  patterns: ['_ml/filters', '_ml/filters/{filter_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-filters',
  parameterTypes: {
    headerParams: [],
    pathParams: ['filter_id'],
    urlParams: ['from', 'size'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_get_filters_request, 'body'),
      ...getShapeAt(ml_get_filters_request, 'path'),
      ...getShapeAt(ml_get_filters_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_filters1_request, 'body'),
      ...getShapeAt(ml_get_filters1_request, 'path'),
      ...getShapeAt(ml_get_filters1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([ml_get_filters_response, ml_get_filters1_response]),
};
