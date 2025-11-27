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
 * Generated at: 2025-11-27T07:43:24.861Z
 * Source: elasticsearch-specification repository, operations: cluster-put-component-template, cluster-put-component-template-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cluster_put_component_template1_request,
  cluster_put_component_template1_response,
  cluster_put_component_template_request,
  cluster_put_component_template_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CLUSTER_PUT_COMPONENT_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.put_component_template',
  connectorGroup: 'internal',
  summary: `Create or update a component template`,
  description: `Create or update a component template.

Component templates are building blocks for constructing index templates that specify index mappings, settings, and aliases.

An index template can be composed of multiple component templates.
To use a component template, specify it in an index template’s \`composed_of\` list.
Component templates are only applied to new data streams and indices as part of a matching index template.

Settings and mappings specified directly in the index template or the create index request override any settings or mappings specified in a component template.

Component templates are only used during index creation.
For data streams, this includes data stream creation and the creation of a stream’s backing indices.
Changes to component templates do not affect existing indices, including a stream’s backing indices.

You can use C-style \`/* *\\/\` block comments in component templates.
You can include comments anywhere in the request body except before the opening curly bracket.

**Applying component templates**

You cannot directly apply a component template to a data stream or index.
To be applied, a component template must be included in an index template's \`composed_of\` list.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-component-template`,
  methods: ['PUT', 'POST'],
  patterns: ['_component_template/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-component-template',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['create', 'cause', 'master_timeout'],
    bodyParams: ['template', 'version', '_meta', 'deprecated'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cluster_put_component_template_request, 'body'),
      ...getShapeAt(cluster_put_component_template_request, 'path'),
      ...getShapeAt(cluster_put_component_template_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cluster_put_component_template1_request, 'body'),
      ...getShapeAt(cluster_put_component_template1_request, 'path'),
      ...getShapeAt(cluster_put_component_template1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    cluster_put_component_template_response,
    cluster_put_component_template1_response,
  ]),
};
