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
 * Source: elasticsearch-specification repository, operations: indices-downsample
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_downsample_request,
  indices_downsample_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_DOWNSAMPLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.downsample',
  summary: `Downsample an index`,
  description: `Downsample an index.

Downsamples a time series (TSDS) index and reduces its size by keeping the last value or by pre-aggregating metrics:

- When running in \`aggregate\` mode, it pre-calculates and stores statistical summaries (\`min\`, \`max\`, \`sum\`, \`value_count\` and \`avg\`)
for each metric field grouped by a configured time interval and their dimensions.
- When running in \`last_value\` mode, it keeps the last value for each metric in the configured interval and their dimensions.

For example, a TSDS index that contains metrics sampled every 10 seconds can be downsampled to an hourly index.
All documents within an hour interval are summarized and stored as a single document in the downsample index.

NOTE: Only indices in a time series data stream are supported.
Neither field nor document level security can be defined on the source index.
The source index must be read-only (\`index.blocks.write: true\`).

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-downsample`,
  methods: ['POST'],
  patterns: ['{index}/_downsample/{target_index}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-downsample',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index', 'target_index'],
    urlParams: [],
    bodyParams: ['fixed_interval', 'sampling_method'],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_downsample_request, 'body'),
    ...getShapeAt(indices_downsample_request, 'path'),
    ...getShapeAt(indices_downsample_request, 'query'),
  }),
  outputSchema: indices_downsample_response,
};
