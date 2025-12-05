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
 * Source: elasticsearch-specification repository, operations: ml-post-calendar-events
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_post_calendar_events_request,
  ml_post_calendar_events_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_POST_CALENDAR_EVENTS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.post_calendar_events',
  summary: `Add scheduled events to the calendar`,
  description: `Add scheduled events to the calendar.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-post-calendar-events`,
  methods: ['POST'],
  patterns: ['_ml/calendars/{calendar_id}/events'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-post-calendar-events',
  parameterTypes: {
    headerParams: [],
    pathParams: ['calendar_id'],
    urlParams: [],
    bodyParams: ['events'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_post_calendar_events_request, 'body'),
    ...getShapeAt(ml_post_calendar_events_request, 'path'),
    ...getShapeAt(ml_post_calendar_events_request, 'query'),
  }),
  outputSchema: ml_post_calendar_events_response,
};
