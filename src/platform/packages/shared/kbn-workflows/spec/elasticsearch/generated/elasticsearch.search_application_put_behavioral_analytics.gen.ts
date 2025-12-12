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
 * Source: elasticsearch-specification repository, operations: search-application-put-behavioral-analytics
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  search_application_put_behavioral_analytics_request,
  search_application_put_behavioral_analytics_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SEARCH_APPLICATION_PUT_BEHAVIORAL_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_application.put_behavioral_analytics',
  summary: `Create a behavioral analytics collection`,
  description: `Create a behavioral analytics collection.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-put-behavioral-analytics`,
  methods: ['PUT'],
  patterns: ['_application/analytics/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-put-behavioral-analytics',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(search_application_put_behavioral_analytics_request, 'body'),
    ...getShapeAt(search_application_put_behavioral_analytics_request, 'path'),
    ...getShapeAt(search_application_put_behavioral_analytics_request, 'query'),
  }),
  outputSchema: search_application_put_behavioral_analytics_response,
};
