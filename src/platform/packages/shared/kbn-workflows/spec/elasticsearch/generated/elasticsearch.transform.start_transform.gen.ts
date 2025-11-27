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
 * Source: elasticsearch-specification repository, operations: transform-start-transform
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  transform_start_transform_request,
  transform_start_transform_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TRANSFORM_START_TRANSFORM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.start_transform',
  connectorGroup: 'internal',
  summary: `Start a transform`,
  description: `Start a transform.

When you start a transform, it creates the destination index if it does not already exist. The \`number_of_shards\` is
set to \`1\` and the \`auto_expand_replicas\` is set to \`0-1\`. If it is a pivot transform, it deduces the mapping
definitions for the destination index from the source indices and the transform aggregations. If fields in the
destination index are derived from scripts (as in the case of \`scripted_metric\` or \`bucket_script\` aggregations),
the transform uses dynamic mappings unless an index template exists. If it is a latest transform, it does not deduce
mapping definitions; it uses dynamic mappings. To use explicit mappings, create the destination index before you
start the transform. Alternatively, you can create an index template, though it does not affect the deduced mappings
in a pivot transform.

When the transform starts, a series of validations occur to ensure its success. If you deferred validation when you
created the transform, they occur when you start the transform—​with the exception of privilege checks. When
Elasticsearch security features are enabled, the transform remembers which roles the user that created it had at the
time of creation and uses those same roles. If those roles do not have the required privileges on the source and
destination indices, the transform fails when it attempts unauthorized operations.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-start-transform`,
  methods: ['POST'],
  patterns: ['_transform/{transform_id}/_start'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-start-transform',
  parameterTypes: {
    headerParams: [],
    pathParams: ['transform_id'],
    urlParams: ['timeout', 'from'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(transform_start_transform_request, 'body'),
    ...getShapeAt(transform_start_transform_request, 'path'),
    ...getShapeAt(transform_start_transform_request, 'query'),
  }),
  outputSchema: transform_start_transform_response,
};
