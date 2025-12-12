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
 * Source: elasticsearch-specification repository, operations: indices-put-template, indices-put-template-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_put_template1_request,
  indices_put_template1_response,
  indices_put_template_request,
  indices_put_template_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_PUT_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.put_template',
  summary: `Create or update a legacy index template`,
  description: `Create or update a legacy index template.

Index templates define settings, mappings, and aliases that can be applied automatically to new indices.
Elasticsearch applies templates to new indices based on an index pattern that matches the index name.

IMPORTANT: This documentation is about legacy index templates, which are deprecated and will be replaced by the composable templates introduced in Elasticsearch 7.8.

Composable templates always take precedence over legacy templates.
If no composable template matches a new index, matching legacy templates are applied according to their order.

Index templates are only applied during index creation.
Changes to index templates do not affect existing indices.
Settings and mappings specified in create index API requests override any settings or mappings specified in an index template.

You can use C-style \`/* *\\/\` block comments in index templates.
You can include comments anywhere in the request body, except before the opening curly bracket.

**Indices matching multiple templates**

Multiple index templates can potentially match an index, in this case, both the settings and mappings are merged into the final configuration of the index.
The order of the merging can be controlled using the order parameter, with lower order being applied first, and higher orders overriding them.
NOTE: Multiple matching templates with the same order value will result in a non-deterministic merging order.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-template`,
  methods: ['PUT', 'POST'],
  patterns: ['_template/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-template',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['create', 'master_timeout', 'order', 'cause'],
    bodyParams: ['aliases', 'index_patterns', 'mappings', 'order', 'settings', 'version'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_put_template_request, 'body'),
      ...getShapeAt(indices_put_template_request, 'path'),
      ...getShapeAt(indices_put_template_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_put_template1_request, 'body'),
      ...getShapeAt(indices_put_template1_request, 'path'),
      ...getShapeAt(indices_put_template1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([indices_put_template_response, indices_put_template1_response]),
};
