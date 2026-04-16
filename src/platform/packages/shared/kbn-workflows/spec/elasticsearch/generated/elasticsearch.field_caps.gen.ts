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
 * Source: elasticsearch-specification repository, operations: field-caps, field-caps-1, field-caps-2, field-caps-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  field_caps1_request,
  field_caps1_response,
  field_caps2_request,
  field_caps2_response,
  field_caps3_request,
  field_caps3_response,
  field_caps_request,
  field_caps_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const FIELD_CAPS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.field_caps',
  summary: `Get the field capabilities`,
  description: `Get the field capabilities.

Get information about the capabilities of fields among multiple indices.

For data streams, the API returns field capabilities among the stream’s backing indices.
It returns runtime fields like any other field.
For example, a runtime field with a type of keyword is returned the same as any other field that belongs to the \`keyword\` family.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-field-caps`,
  methods: ['GET', 'POST'],
  patterns: ['_field_caps', '{index}/_field_caps'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-field-caps',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'fields',
      'ignore_unavailable',
      'include_unmapped',
      'filters',
      'types',
      'include_empty_fields',
    ],
    bodyParams: ['fields', 'index_filter', 'runtime_mappings'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(field_caps_request, 'body'),
      ...getShapeAt(field_caps_request, 'path'),
      ...getShapeAt(field_caps_request, 'query'),
    }),
    z.object({
      ...getShapeAt(field_caps1_request, 'body'),
      ...getShapeAt(field_caps1_request, 'path'),
      ...getShapeAt(field_caps1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(field_caps2_request, 'body'),
      ...getShapeAt(field_caps2_request, 'path'),
      ...getShapeAt(field_caps2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(field_caps3_request, 'body'),
      ...getShapeAt(field_caps3_request, 'path'),
      ...getShapeAt(field_caps3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    field_caps_response,
    field_caps1_response,
    field_caps2_response,
    field_caps3_response,
  ]),
};
