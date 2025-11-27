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
 * Generated at: 2025-11-27T07:43:24.896Z
 * Source: elasticsearch-specification repository, operations: ml-get-calendar-events
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_get_calendar_events_request,
  ml_get_calendar_events_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_GET_CALENDAR_EVENTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_calendar_events',
  connectorGroup: 'internal',
  summary: `Get info about events in calendars`,
  description: `Get info about events in calendars.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-calendar-events`,
  methods: ['GET'],
  patterns: ['_ml/calendars/{calendar_id}/events'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-calendar-events',
  parameterTypes: {
    headerParams: [],
    pathParams: ['calendar_id'],
    urlParams: ['end', 'from', 'job_id', 'size', 'start'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_get_calendar_events_request, 'body'),
    ...getShapeAt(ml_get_calendar_events_request, 'path'),
    ...getShapeAt(ml_get_calendar_events_request, 'query'),
  }),
  outputSchema: ml_get_calendar_events_response,
};
