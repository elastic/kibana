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
 * Generated at: 2025-11-27T07:04:28.247Z
 * Source: elasticsearch-specification repository, operations: search-template, search-template-1, search-template-2, search-template-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  search_template1_request,
  search_template1_response,
  search_template2_request,
  search_template2_response,
  search_template3_request,
  search_template3_response,
  search_template_request,
  search_template_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SEARCH_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_template',
  connectorGroup: 'internal',
  summary: `Run a search with a search template`,
  description: `Run a search with a search template.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-template`,
  methods: ['GET', 'POST'],
  patterns: ['_search/template', '{index}/_search/template'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-template',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'ccs_minimize_roundtrips',
      'expand_wildcards',
      'explain',
      'ignore_throttled',
      'ignore_unavailable',
      'preference',
      'profile',
      'routing',
      'scroll',
      'search_type',
      'rest_total_hits_as_int',
      'typed_keys',
    ],
    bodyParams: ['explain', 'id', 'params', 'profile', 'source'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(search_template_request, 'body'),
      ...getShapeAt(search_template_request, 'path'),
      ...getShapeAt(search_template_request, 'query'),
    }),
    z.object({
      ...getShapeAt(search_template1_request, 'body'),
      ...getShapeAt(search_template1_request, 'path'),
      ...getShapeAt(search_template1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(search_template2_request, 'body'),
      ...getShapeAt(search_template2_request, 'path'),
      ...getShapeAt(search_template2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(search_template3_request, 'body'),
      ...getShapeAt(search_template3_request, 'path'),
      ...getShapeAt(search_template3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    search_template_response,
    search_template1_response,
    search_template2_response,
    search_template3_response,
  ]),
};
