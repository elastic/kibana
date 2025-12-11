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
 * Source: elasticsearch-specification repository, operations: search-application-get-behavioral-analytics, search-application-get-behavioral-analytics-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  search_application_get_behavioral_analytics1_request,
  search_application_get_behavioral_analytics1_response,
  search_application_get_behavioral_analytics_request,
  search_application_get_behavioral_analytics_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SEARCH_APPLICATION_GET_BEHAVIORAL_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_application.get_behavioral_analytics',
  summary: `Get behavioral analytics collections`,
  description: `Get behavioral analytics collections.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-get-behavioral-analytics`,
  methods: ['GET'],
  patterns: ['_application/analytics', '_application/analytics/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-get-behavioral-analytics',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(search_application_get_behavioral_analytics_request, 'body'),
      ...getShapeAt(search_application_get_behavioral_analytics_request, 'path'),
      ...getShapeAt(search_application_get_behavioral_analytics_request, 'query'),
    }),
    z.object({
      ...getShapeAt(search_application_get_behavioral_analytics1_request, 'body'),
      ...getShapeAt(search_application_get_behavioral_analytics1_request, 'path'),
      ...getShapeAt(search_application_get_behavioral_analytics1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    search_application_get_behavioral_analytics_response,
    search_application_get_behavioral_analytics1_response,
  ]),
};
