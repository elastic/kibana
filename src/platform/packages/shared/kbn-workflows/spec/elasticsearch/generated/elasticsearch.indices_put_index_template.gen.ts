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
 * Source: elasticsearch-specification repository, operations: indices-put-index-template, indices-put-index-template-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_put_index_template1_request,
  indices_put_index_template1_response,
  indices_put_index_template_request,
  indices_put_index_template_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_PUT_INDEX_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.put_index_template',
  summary: `Create or update an index template`,
  description: `Create or update an index template.

Index templates define settings, mappings, and aliases that can be applied automatically to new indices.

Elasticsearch applies templates to new indices based on an wildcard pattern that matches the index name.
Index templates are applied during data stream or index creation.
For data streams, these settings and mappings are applied when the stream's backing indices are created.
Settings and mappings specified in a create index API request override any settings or mappings specified in an index template.
Changes to index templates do not affect existing indices, including the existing backing indices of a data stream.

You can use C-style \`/* *\\/\` block comments in index templates.
You can include comments anywhere in the request body, except before the opening curly bracket.

**Multiple matching templates**

If multiple index templates match the name of a new index or data stream, the template with the highest priority is used.

Multiple templates with overlapping index patterns at the same priority are not allowed and an error will be thrown when attempting to create a template matching an existing index template at identical priorities.

**Composing aliases, mappings, and settings**

When multiple component templates are specified in the \`composed_of\` field for an index template, they are merged in the order specified, meaning that later component templates override earlier component templates.
Any mappings, settings, or aliases from the parent index template are merged in next.
Finally, any configuration on the index request itself is merged.
Mapping definitions are merged recursively, which means that later mapping components can introduce new field mappings and update the mapping configuration.
If a field mapping is already contained in an earlier component, its definition will be completely overwritten by the later one.
This recursive merging strategy applies not only to field mappings, but also root options like \`dynamic_templates\` and \`meta\`.
If an earlier component contains a \`dynamic_templates\` block, then by default new \`dynamic_templates\` entries are appended onto the end.
If an entry already exists with the same key, then it is overwritten by the new definition.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-index-template`,
  methods: ['PUT', 'POST'],
  patterns: ['_index_template/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-index-template',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['create', 'master_timeout', 'cause'],
    bodyParams: [
      'index_patterns',
      'composed_of',
      'template',
      'data_stream',
      'priority',
      'version',
      '_meta',
      'allow_auto_create',
      'ignore_missing_component_templates',
      'deprecated',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_put_index_template_request, 'body'),
      ...getShapeAt(indices_put_index_template_request, 'path'),
      ...getShapeAt(indices_put_index_template_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_put_index_template1_request, 'body'),
      ...getShapeAt(indices_put_index_template1_request, 'path'),
      ...getShapeAt(indices_put_index_template1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    indices_put_index_template_response,
    indices_put_index_template1_response,
  ]),
};
