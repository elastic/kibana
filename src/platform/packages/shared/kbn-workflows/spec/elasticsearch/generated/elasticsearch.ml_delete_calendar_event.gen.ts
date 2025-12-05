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
 * Source: elasticsearch-specification repository, operations: ml-delete-calendar-event
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_delete_calendar_event_request,
  ml_delete_calendar_event_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_DELETE_CALENDAR_EVENT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_calendar_event',
  summary: `Delete events from a calendar`,
  description: `Delete events from a calendar.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-calendar-event`,
  methods: ['DELETE'],
  patterns: ['_ml/calendars/{calendar_id}/events/{event_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-calendar-event',
  parameterTypes: {
    headerParams: [],
    pathParams: ['calendar_id', 'event_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_delete_calendar_event_request, 'body'),
    ...getShapeAt(ml_delete_calendar_event_request, 'path'),
    ...getShapeAt(ml_delete_calendar_event_request, 'query'),
  }),
  outputSchema: ml_delete_calendar_event_response,
};
