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
 * Source: elasticsearch-specification repository, operations: rollup-get-rollup-index-caps
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  rollup_get_rollup_index_caps_request,
  rollup_get_rollup_index_caps_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ROLLUP_GET_ROLLUP_INDEX_CAPS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.rollup.get_rollup_index_caps',
  summary: `Get the rollup index capabilities`,
  description: `Get the rollup index capabilities.

Get the rollup capabilities of all jobs inside of a rollup index.
A single rollup index may store the data for multiple rollup jobs and may have a variety of capabilities depending on those jobs. This API enables you to determine:

* What jobs are stored in an index (or indices specified via a pattern)?
* What target indices were rolled up, what fields were used in those rollups, and what aggregations can be performed on each job?

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-get-rollup-index-caps`,
  methods: ['GET'],
  patterns: ['{index}/_rollup/data'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-get-rollup-index-caps',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(rollup_get_rollup_index_caps_request, 'body'),
    ...getShapeAt(rollup_get_rollup_index_caps_request, 'path'),
    ...getShapeAt(rollup_get_rollup_index_caps_request, 'query'),
  }),
  outputSchema: rollup_get_rollup_index_caps_response,
};
