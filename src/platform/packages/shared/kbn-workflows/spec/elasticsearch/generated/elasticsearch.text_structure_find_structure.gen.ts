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
 * Source: elasticsearch-specification repository, operations: text-structure-find-structure
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  text_structure_find_structure_request,
  text_structure_find_structure_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TEXT_STRUCTURE_FIND_STRUCTURE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.text_structure.find_structure',
  summary: `Find the structure of a text file`,
  description: `Find the structure of a text file.

The text file must contain data that is suitable to be ingested into Elasticsearch.

This API provides a starting point for ingesting data into Elasticsearch in a format that is suitable for subsequent use with other Elastic Stack functionality.
Unlike other Elasticsearch endpoints, the data that is posted to this endpoint does not need to be UTF-8 encoded and in JSON format.
It must, however, be text; binary text formats are not currently supported.
The size is limited to the Elasticsearch HTTP receive buffer size, which defaults to 100 Mb.

The response from the API contains:

* A couple of messages from the beginning of the text.
* Statistics that reveal the most common values for all fields detected within the text and basic numeric statistics for numeric fields.
* Information about the structure of the text, which is useful when you write ingest configurations to index it or similarly formatted text.
* Appropriate mappings for an Elasticsearch index, which you could use to ingest the text.

All this information can be calculated by the structure finder with no guidance.
However, you can optionally override some of the decisions about the text structure by specifying one or more query parameters.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-text-structure-find-structure`,
  methods: ['POST'],
  patterns: ['_text_structure/find_structure'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-text-structure-find-structure',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'charset',
      'column_names',
      'delimiter',
      'ecs_compatibility',
      'explain',
      'format',
      'grok_pattern',
      'has_header_row',
      'line_merge_size_limit',
      'lines_to_sample',
      'quote',
      'should_trim_fields',
      'timeout',
      'timestamp_field',
      'timestamp_format',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(text_structure_find_structure_request, 'body'),
    ...getShapeAt(text_structure_find_structure_request, 'path'),
    ...getShapeAt(text_structure_find_structure_request, 'query'),
  }),
  outputSchema: text_structure_find_structure_response,
};
