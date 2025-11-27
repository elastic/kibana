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
 * Source: elasticsearch-specification repository, operations: terms-enum, terms-enum-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  terms_enum1_request,
  terms_enum1_response,
  terms_enum_request,
  terms_enum_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TERMS_ENUM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.terms_enum',
  connectorGroup: 'internal',
  summary: `Get terms in an index`,
  description: `Get terms in an index.

Discover terms that match a partial string in an index.
This API is designed for low-latency look-ups used in auto-complete scenarios.

> info
> The terms enum API may return terms from deleted documents. Deleted documents are initially only marked as deleted. It is not until their segments are merged that documents are actually deleted. Until that happens, the terms enum API will return terms from these documents.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-terms-enum`,
  methods: ['GET', 'POST'],
  patterns: ['{index}/_terms_enum'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-terms-enum',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [],
    bodyParams: [
      'field',
      'size',
      'timeout',
      'case_insensitive',
      'index_filter',
      'string',
      'search_after',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(terms_enum_request, 'body'),
      ...getShapeAt(terms_enum_request, 'path'),
      ...getShapeAt(terms_enum_request, 'query'),
    }),
    z.object({
      ...getShapeAt(terms_enum1_request, 'body'),
      ...getShapeAt(terms_enum1_request, 'path'),
      ...getShapeAt(terms_enum1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([terms_enum_response, terms_enum1_response]),
};
