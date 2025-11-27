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
 * Source: elasticsearch-specification repository, operations: text-structure-find-message-structure, text-structure-find-message-structure-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  text_structure_find_message_structure1_request,
  text_structure_find_message_structure1_response,
  text_structure_find_message_structure_request,
  text_structure_find_message_structure_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TEXT_STRUCTURE_FIND_MESSAGE_STRUCTURE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.text_structure.find_message_structure',
  connectorGroup: 'internal',
  summary: `Find the structure of text messages`,
  description: `Find the structure of text messages.

Find the structure of a list of text messages.
The messages must contain data that is suitable to be ingested into Elasticsearch.

This API provides a starting point for ingesting data into Elasticsearch in a format that is suitable for subsequent use with other Elastic Stack functionality.
Use this API rather than the find text structure API if your input text has already been split up into separate messages by some other process.

The response from the API contains:

* Sample messages.
* Statistics that reveal the most common values for all fields detected within the text and basic numeric statistics for numeric fields.
* Information about the structure of the text, which is useful when you write ingest configurations to index it or similarly formatted text.
Appropriate mappings for an Elasticsearch index, which you could use to ingest the text.

All this information can be calculated by the structure finder with no guidance.
However, you can optionally override some of the decisions about the text structure by specifying one or more query parameters.

If the structure finder produces unexpected results, specify the \`explain\` query parameter and an explanation will appear in the response.
It helps determine why the returned structure was chosen.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-text-structure-find-message-structure`,
  methods: ['GET', 'POST'],
  patterns: ['_text_structure/find_message_structure'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-text-structure-find-message-structure',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'column_names',
      'delimiter',
      'ecs_compatibility',
      'explain',
      'format',
      'grok_pattern',
      'quote',
      'should_trim_fields',
      'timeout',
      'timestamp_field',
      'timestamp_format',
    ],
    bodyParams: ['messages'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(text_structure_find_message_structure_request, 'body'),
      ...getShapeAt(text_structure_find_message_structure_request, 'path'),
      ...getShapeAt(text_structure_find_message_structure_request, 'query'),
    }),
    z.object({
      ...getShapeAt(text_structure_find_message_structure1_request, 'body'),
      ...getShapeAt(text_structure_find_message_structure1_request, 'path'),
      ...getShapeAt(text_structure_find_message_structure1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    text_structure_find_message_structure_response,
    text_structure_find_message_structure1_response,
  ]),
};
