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
 * Generated at: 2025-11-27T07:43:24.854Z
 * Source: elasticsearch-specification repository, operations: cat-component-templates, cat-component-templates-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cat_component_templates1_request,
  cat_component_templates1_response,
  cat_component_templates_request,
  cat_component_templates_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_COMPONENT_TEMPLATES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.component_templates',
  connectorGroup: 'internal',
  summary: `Get component templates`,
  description: `Get component templates.

Get information about component templates in a cluster.
Component templates are building blocks for constructing index templates that specify index mappings, settings, and aliases.

IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console.
They are not intended for use by applications. For application consumption, use the get component template API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-component-templates`,
  methods: ['GET'],
  patterns: ['_cat/component_templates', '_cat/component_templates/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-component-templates',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['h', 's', 'local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cat_component_templates_request, 'body'),
      ...getShapeAt(cat_component_templates_request, 'path'),
      ...getShapeAt(cat_component_templates_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cat_component_templates1_request, 'body'),
      ...getShapeAt(cat_component_templates1_request, 'path'),
      ...getShapeAt(cat_component_templates1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cat_component_templates_response, cat_component_templates1_response]),
};
