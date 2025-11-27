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
 * Generated at: 2025-11-27T07:04:28.236Z
 * Source: elasticsearch-specification repository, operations: ml-info
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_info_request, ml_info_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_INFO_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.info',
  connectorGroup: 'internal',
  summary: `Get machine learning information`,
  description: `Get machine learning information.

Get defaults and limits used by machine learning.
This endpoint is designed to be used by a user interface that needs to fully
understand machine learning configurations where some options are not
specified, meaning that the defaults should be used. This endpoint may be
used to find out what those defaults are. It also provides information about
the maximum size of machine learning jobs that could run in the current
cluster configuration.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-info`,
  methods: ['GET'],
  patterns: ['_ml/info'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-info',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_info_request, 'body'),
    ...getShapeAt(ml_info_request, 'path'),
    ...getShapeAt(ml_info_request, 'query'),
  }),
  outputSchema: ml_info_response,
};
