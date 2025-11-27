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
 * Generated at: 2025-11-27T07:04:28.244Z
 * Source: elasticsearch-specification repository, operations: render-search-template, render-search-template-1, render-search-template-2, render-search-template-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  render_search_template1_request,
  render_search_template1_response,
  render_search_template2_request,
  render_search_template2_response,
  render_search_template3_request,
  render_search_template3_response,
  render_search_template_request,
  render_search_template_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const RENDER_SEARCH_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.render_search_template',
  connectorGroup: 'internal',
  summary: `Render a search template`,
  description: `Render a search template.

Render a search template as a search request body.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-render-search-template`,
  methods: ['GET', 'POST'],
  patterns: ['_render/template', '_render/template/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-render-search-template',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['id', 'file', 'params', 'source'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(render_search_template_request, 'body'),
      ...getShapeAt(render_search_template_request, 'path'),
      ...getShapeAt(render_search_template_request, 'query'),
    }),
    z.object({
      ...getShapeAt(render_search_template1_request, 'body'),
      ...getShapeAt(render_search_template1_request, 'path'),
      ...getShapeAt(render_search_template1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(render_search_template2_request, 'body'),
      ...getShapeAt(render_search_template2_request, 'path'),
      ...getShapeAt(render_search_template2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(render_search_template3_request, 'body'),
      ...getShapeAt(render_search_template3_request, 'path'),
      ...getShapeAt(render_search_template3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    render_search_template_response,
    render_search_template1_response,
    render_search_template2_response,
    render_search_template3_response,
  ]),
};
