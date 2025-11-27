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
 * Generated at: 2025-11-27T07:43:24.908Z
 * Source: elasticsearch-specification repository, operations: search-application-post-behavioral-analytics-event
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  search_application_post_behavioral_analytics_event_request,
  search_application_post_behavioral_analytics_event_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SEARCH_APPLICATION_POST_BEHAVIORAL_ANALYTICS_EVENT_CONTRACT: InternalConnectorContract =
  {
    type: 'elasticsearch.search_application.post_behavioral_analytics_event',
    connectorGroup: 'internal',
    summary: `Create a behavioral analytics collection event`,
    description: `Create a behavioral analytics collection event.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-post-behavioral-analytics-event`,
    methods: ['POST'],
    patterns: ['_application/analytics/{collection_name}/event/{event_type}'],
    documentation:
      'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-post-behavioral-analytics-event',
    parameterTypes: {
      headerParams: [],
      pathParams: ['collection_name', 'event_type'],
      urlParams: ['debug'],
      bodyParams: [],
    },
    paramsSchema: z.object({
      ...getShapeAt(search_application_post_behavioral_analytics_event_request, 'body'),
      ...getShapeAt(search_application_post_behavioral_analytics_event_request, 'path'),
      ...getShapeAt(search_application_post_behavioral_analytics_event_request, 'query'),
    }),
    outputSchema: search_application_post_behavioral_analytics_event_response,
  };
