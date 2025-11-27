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
 * Generated at: 2025-11-27T07:04:28.234Z
 * Source: elasticsearch-specification repository, operations: ml-get-calendars, ml-get-calendars-1, ml-get-calendars-2, ml-get-calendars-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_get_calendars1_request,
  ml_get_calendars1_response,
  ml_get_calendars2_request,
  ml_get_calendars2_response,
  ml_get_calendars3_request,
  ml_get_calendars3_response,
  ml_get_calendars_request,
  ml_get_calendars_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_GET_CALENDARS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_calendars',
  connectorGroup: 'internal',
  summary: `Get calendar configuration info`,
  description: `Get calendar configuration info.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-calendars`,
  methods: ['GET', 'POST'],
  patterns: ['_ml/calendars', '_ml/calendars/{calendar_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-calendars',
  parameterTypes: {
    headerParams: [],
    pathParams: ['calendar_id'],
    urlParams: ['from', 'size'],
    bodyParams: ['page'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_get_calendars_request, 'body'),
      ...getShapeAt(ml_get_calendars_request, 'path'),
      ...getShapeAt(ml_get_calendars_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_calendars1_request, 'body'),
      ...getShapeAt(ml_get_calendars1_request, 'path'),
      ...getShapeAt(ml_get_calendars1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_calendars2_request, 'body'),
      ...getShapeAt(ml_get_calendars2_request, 'path'),
      ...getShapeAt(ml_get_calendars2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_calendars3_request, 'body'),
      ...getShapeAt(ml_get_calendars3_request, 'path'),
      ...getShapeAt(ml_get_calendars3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    ml_get_calendars_response,
    ml_get_calendars1_response,
    ml_get_calendars2_response,
    ml_get_calendars3_response,
  ]),
};
