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
 * Source: elasticsearch-specification repository, operations: transform-schedule-now-transform
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  transform_schedule_now_transform_request,
  transform_schedule_now_transform_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TRANSFORM_SCHEDULE_NOW_TRANSFORM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.schedule_now_transform',
  summary: `Schedule a transform to start now`,
  description: `Schedule a transform to start now.

Instantly run a transform to process data.
If you run this API, the transform will process the new data instantly,
without waiting for the configured frequency interval. After the API is called,
the transform will be processed again at \`now + frequency\` unless the API
is called again in the meantime.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-schedule-now-transform`,
  methods: ['POST'],
  patterns: ['_transform/{transform_id}/_schedule_now'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-schedule-now-transform',
  parameterTypes: {
    headerParams: [],
    pathParams: ['transform_id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(transform_schedule_now_transform_request, 'body'),
    ...getShapeAt(transform_schedule_now_transform_request, 'path'),
    ...getShapeAt(transform_schedule_now_transform_request, 'query'),
  }),
  outputSchema: transform_schedule_now_transform_response,
};
