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
 * Generated at: 2025-11-27T07:04:28.260Z
 * Source: elasticsearch-specification repository, operations: transform-put-transform
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  transform_put_transform_request,
  transform_put_transform_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TRANSFORM_PUT_TRANSFORM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.put_transform',
  connectorGroup: 'internal',
  summary: `Create a transform`,
  description: `Create a transform.

Creates a transform.

A transform copies data from source indices, transforms it, and persists it into an entity-centric destination index. You can also think of the destination index as a two-dimensional tabular data structure (known as
a data frame). The ID for each document in the data frame is generated from a hash of the entity, so there is a
unique row per entity.

You must choose either the latest or pivot method for your transform; you cannot use both in a single transform. If
you choose to use the pivot method for your transform, the entities are defined by the set of \`group_by\` fields in
the pivot object. If you choose to use the latest method, the entities are defined by the \`unique_key\` field values
in the latest object.

You must have \`create_index\`, \`index\`, and \`read\` privileges on the destination index and \`read\` and
\`view_index_metadata\` privileges on the source indices. When Elasticsearch security features are enabled, the
transform remembers which roles the user that created it had at the time of creation and uses those same roles. If
those roles do not have the required privileges on the source and destination indices, the transform fails when it
attempts unauthorized operations.

NOTE: You must use Kibana or this API to create a transform. Do not add a transform directly into any
\`.transform-internal*\` indices using the Elasticsearch index API. If Elasticsearch security features are enabled, do
not give users any privileges on \`.transform-internal*\` indices. If you used transforms prior to 7.5, also do not
give users any privileges on \`.data-frame-internal*\` indices.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-put-transform`,
  methods: ['PUT'],
  patterns: ['_transform/{transform_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-put-transform',
  parameterTypes: {
    headerParams: [],
    pathParams: ['transform_id'],
    urlParams: ['defer_validation', 'timeout'],
    bodyParams: [
      'dest',
      'description',
      'frequency',
      'latest',
      '_meta',
      'pivot',
      'retention_policy',
      'settings',
      'source',
      'sync',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(transform_put_transform_request, 'body'),
    ...getShapeAt(transform_put_transform_request, 'path'),
    ...getShapeAt(transform_put_transform_request, 'query'),
  }),
  outputSchema: transform_put_transform_response,
};
