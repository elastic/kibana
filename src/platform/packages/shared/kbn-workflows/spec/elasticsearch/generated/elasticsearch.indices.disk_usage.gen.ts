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
 * Generated at: 2025-11-27T07:43:24.875Z
 * Source: elasticsearch-specification repository, operations: indices-disk-usage
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { indices_disk_usage_request, indices_disk_usage_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_DISK_USAGE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.disk_usage',
  connectorGroup: 'internal',
  summary: `Analyze the index disk usage`,
  description: `Analyze the index disk usage.

Analyze the disk usage of each field of an index or data stream.
This API might not support indices created in previous Elasticsearch versions.
The result of a small index can be inaccurate as some parts of an index might not be analyzed by the API.

NOTE: The total size of fields of the analyzed shards of the index in the response is usually smaller than the index \`store_size\` value because some small metadata files are ignored and some parts of data files might not be scanned by the API.
Since stored fields are stored together in a compressed format, the sizes of stored fields are also estimates and can be inaccurate.
The stored size of the \`_id\` field is likely underestimated while the \`_source\` field is overestimated.

For usage examples see the External documentation or refer to [Analyze the index disk usage example](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/index-disk-usage) for an example.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-disk-usage`,
  methods: ['POST'],
  patterns: ['{index}/_disk_usage'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-disk-usage',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'flush',
      'ignore_unavailable',
      'run_expensive_tasks',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_disk_usage_request, 'body'),
    ...getShapeAt(indices_disk_usage_request, 'path'),
    ...getShapeAt(indices_disk_usage_request, 'query'),
  }),
  outputSchema: indices_disk_usage_response,
};
