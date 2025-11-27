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
 * Generated at: 2025-11-27T07:04:28.222Z
 * Source: elasticsearch-specification repository, operations: indices-migrate-to-data-stream
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_migrate_to_data_stream_request,
  indices_migrate_to_data_stream_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_MIGRATE_TO_DATA_STREAM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.migrate_to_data_stream',
  connectorGroup: 'internal',
  summary: `Convert an index alias to a data stream`,
  description: `Convert an index alias to a data stream.

Converts an index alias to a data stream.
You must have a matching index template that is data stream enabled.
The alias must meet the following criteria:
The alias must have a write index;
All indices for the alias must have a \`@timestamp\` field mapping of a \`date\` or \`date_nanos\` field type;
The alias must not have any filters;
The alias must not use custom routing.
If successful, the request removes the alias and creates a data stream with the same name.
The indices for the alias become hidden backing indices for the stream.
The write index for the alias becomes the write index for the stream.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-migrate-to-data-stream`,
  methods: ['POST'],
  patterns: ['_data_stream/_migrate/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-migrate-to-data-stream',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_migrate_to_data_stream_request, 'body'),
    ...getShapeAt(indices_migrate_to_data_stream_request, 'path'),
    ...getShapeAt(indices_migrate_to_data_stream_request, 'query'),
  }),
  outputSchema: indices_migrate_to_data_stream_response,
};
