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
 * Generated at: 2025-11-27T07:43:24.857Z
 * Source: elasticsearch-specification repository, operations: cat-templates, cat-templates-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cat_templates1_request,
  cat_templates1_response,
  cat_templates_request,
  cat_templates_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_TEMPLATES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.templates',
  connectorGroup: 'internal',
  summary: `Get index template information`,
  description: `Get index template information.

Get information about the index templates in a cluster.
You can use index templates to apply index settings and field mappings to new indices at creation.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the get index template API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-templates`,
  methods: ['GET'],
  patterns: ['_cat/templates', '_cat/templates/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-templates',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['h', 's', 'local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cat_templates_request, 'body'),
      ...getShapeAt(cat_templates_request, 'path'),
      ...getShapeAt(cat_templates_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cat_templates1_request, 'body'),
      ...getShapeAt(cat_templates1_request, 'path'),
      ...getShapeAt(cat_templates1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cat_templates_response, cat_templates1_response]),
};
