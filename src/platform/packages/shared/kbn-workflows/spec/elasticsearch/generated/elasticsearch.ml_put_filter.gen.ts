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
 * Source: elasticsearch-specification repository, operations: ml-put-filter
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_put_filter_request, ml_put_filter_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_PUT_FILTER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_filter',
  summary: `Create a filter`,
  description: `Create a filter.

A filter contains a list of strings. It can be used by one or more anomaly detection jobs.
Specifically, filters are referenced in the \`custom_rules\` property of detector configuration objects.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-filter`,
  methods: ['PUT'],
  patterns: ['_ml/filters/{filter_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-filter',
  parameterTypes: {
    headerParams: [],
    pathParams: ['filter_id'],
    urlParams: [],
    bodyParams: ['description', 'items'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_put_filter_request, 'body'),
    ...getShapeAt(ml_put_filter_request, 'path'),
    ...getShapeAt(ml_put_filter_request, 'query'),
  }),
  outputSchema: ml_put_filter_response,
};
