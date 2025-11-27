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
 * Generated at: 2025-11-27T07:04:28.237Z
 * Source: elasticsearch-specification repository, operations: ml-put-calendar
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_put_calendar_request, ml_put_calendar_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_PUT_CALENDAR_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_calendar',
  connectorGroup: 'internal',
  summary: `Create a calendar`,
  description: `Create a calendar.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-calendar`,
  methods: ['PUT'],
  patterns: ['_ml/calendars/{calendar_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-calendar',
  parameterTypes: {
    headerParams: [],
    pathParams: ['calendar_id'],
    urlParams: [],
    bodyParams: ['job_ids', 'description'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_put_calendar_request, 'body'),
    ...getShapeAt(ml_put_calendar_request, 'path'),
    ...getShapeAt(ml_put_calendar_request, 'query'),
  }),
  outputSchema: ml_put_calendar_response,
};
