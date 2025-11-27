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
 * Generated at: 2025-11-27T07:04:28.259Z
 * Source: elasticsearch-specification repository, operations: text-structure-find-field-structure
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  text_structure_find_field_structure_request,
  text_structure_find_field_structure_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TEXT_STRUCTURE_FIND_FIELD_STRUCTURE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.text_structure.find_field_structure',
  connectorGroup: 'internal',
  summary: `Find the structure of a text field`,
  description: `Find the structure of a text field.

Find the structure of a text field in an Elasticsearch index.

This API provides a starting point for extracting further information from log messages already ingested into Elasticsearch.
For example, if you have ingested data into a very simple index that has just \`@timestamp\` and message fields, you can use this API to see what common structure exists in the message field.

The response from the API contains:

* Sample messages.
* Statistics that reveal the most common values for all fields detected within the text and basic numeric statistics for numeric fields.
* Information about the structure of the text, which is useful when you write ingest configurations to index it or similarly formatted text.
* Appropriate mappings for an Elasticsearch index, which you could use to ingest the text.

All this information can be calculated by the structure finder with no guidance.
However, you can optionally override some of the decisions about the text structure by specifying one or more query parameters.

If the structure finder produces unexpected results, specify the \`explain\` query parameter and an explanation will appear in the response.
It helps determine why the returned structure was chosen.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-text_structure`,
  methods: ['GET'],
  patterns: ['_text_structure/find_field_structure'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-text_structure',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'column_names',
      'delimiter',
      'documents_to_sample',
      'ecs_compatibility',
      'explain',
      'field',
      'format',
      'grok_pattern',
      'index',
      'quote',
      'should_trim_fields',
      'timeout',
      'timestamp_field',
      'timestamp_format',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(text_structure_find_field_structure_request, 'body'),
    ...getShapeAt(text_structure_find_field_structure_request, 'path'),
    ...getShapeAt(text_structure_find_field_structure_request, 'query'),
  }),
  outputSchema: text_structure_find_field_structure_response,
};
