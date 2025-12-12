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
 * Source: elasticsearch-specification repository, operations: rollup-get-rollup-caps, rollup-get-rollup-caps-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  rollup_get_rollup_caps1_request,
  rollup_get_rollup_caps1_response,
  rollup_get_rollup_caps_request,
  rollup_get_rollup_caps_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ROLLUP_GET_ROLLUP_CAPS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.rollup.get_rollup_caps',
  summary: `Get the rollup job capabilities`,
  description: `Get the rollup job capabilities.

Get the capabilities of any rollup jobs that have been configured for a specific index or index pattern.

This API is useful because a rollup job is often configured to rollup only a subset of fields from the source index.
Furthermore, only certain aggregations can be configured for various fields, leading to a limited subset of functionality depending on that configuration.
This API enables you to inspect an index and determine:

1. Does this index have associated rollup data somewhere in the cluster?
2. If yes to the first question, what fields were rolled up, what aggregations can be performed, and where does the data live?

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-get-rollup-caps`,
  methods: ['GET'],
  patterns: ['_rollup/data/{id}', '_rollup/data'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-get-rollup-caps',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(rollup_get_rollup_caps_request, 'body'),
      ...getShapeAt(rollup_get_rollup_caps_request, 'path'),
      ...getShapeAt(rollup_get_rollup_caps_request, 'query'),
    }),
    z.object({
      ...getShapeAt(rollup_get_rollup_caps1_request, 'body'),
      ...getShapeAt(rollup_get_rollup_caps1_request, 'path'),
      ...getShapeAt(rollup_get_rollup_caps1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([rollup_get_rollup_caps_response, rollup_get_rollup_caps1_response]),
};
