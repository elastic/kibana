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
 * Source: elasticsearch-specification repository, operations: indices-put-mapping, indices-put-mapping-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_put_mapping1_request,
  indices_put_mapping1_response,
  indices_put_mapping_request,
  indices_put_mapping_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_PUT_MAPPING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.put_mapping',
  summary: `Update field mappings`,
  description: `Update field mappings.

Add new fields to an existing data stream or index.
You can use the update mapping API to:

- Add a new field to an existing index
- Update mappings for multiple indices in a single request
- Add new properties to an object field
- Enable multi-fields for an existing field
- Update supported mapping parameters
- Change a field's mapping using reindexing
- Rename a field using a field alias

Learn how to use the update mapping API with practical examples in the [Update mapping API examples](https://www.elastic.co/docs/manage-data/data-store/mapping/update-mappings-examples) guide.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-mapping`,
  methods: ['PUT', 'POST'],
  patterns: ['{index}/_mapping'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-mapping',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'ignore_unavailable',
      'master_timeout',
      'timeout',
      'write_index_only',
    ],
    bodyParams: [
      'date_detection',
      'dynamic',
      'dynamic_date_formats',
      'dynamic_templates',
      '_field_names',
      '_meta',
      'numeric_detection',
      'properties',
      '_routing',
      '_source',
      'runtime',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_put_mapping_request, 'body'),
      ...getShapeAt(indices_put_mapping_request, 'path'),
      ...getShapeAt(indices_put_mapping_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_put_mapping1_request, 'body'),
      ...getShapeAt(indices_put_mapping1_request, 'path'),
      ...getShapeAt(indices_put_mapping1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([indices_put_mapping_response, indices_put_mapping1_response]),
};
