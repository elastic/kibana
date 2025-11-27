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
 * Generated at: 2025-11-27T07:04:28.211Z
 * Source: elasticsearch-specification repository, operations: get-script-languages
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { get_script_languages_request, get_script_languages_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const GET_SCRIPT_LANGUAGES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.get_script_languages',
  connectorGroup: 'internal',
  summary: `Get script languages`,
  description: `Get script languages.

Get a list of available script types, languages, and contexts.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get-script-languages`,
  methods: ['GET'],
  patterns: ['_script_language'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-get-script-languages',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(get_script_languages_request, 'body'),
    ...getShapeAt(get_script_languages_request, 'path'),
    ...getShapeAt(get_script_languages_request, 'query'),
  }),
  outputSchema: get_script_languages_response,
};
