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
 * Source: elasticsearch-specification repository, operations: indices-get-settings, indices-get-settings-1, indices-get-settings-2, indices-get-settings-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_get_settings1_request,
  indices_get_settings1_response,
  indices_get_settings2_request,
  indices_get_settings2_response,
  indices_get_settings3_request,
  indices_get_settings3_response,
  indices_get_settings_request,
  indices_get_settings_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_GET_SETTINGS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_settings',
  connectorGroup: 'internal',
  summary: `Get index settings`,
  description: `Get index settings.

Get setting information for one or more indices.
For data streams, it returns setting information for the stream's backing indices.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-settings`,
  methods: ['GET'],
  patterns: ['_settings', '{index}/_settings', '{index}/_settings/{name}', '_settings/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-settings',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index', 'name'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'flat_settings',
      'ignore_unavailable',
      'include_defaults',
      'local',
      'master_timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_get_settings_request, 'body'),
      ...getShapeAt(indices_get_settings_request, 'path'),
      ...getShapeAt(indices_get_settings_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_get_settings1_request, 'body'),
      ...getShapeAt(indices_get_settings1_request, 'path'),
      ...getShapeAt(indices_get_settings1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_get_settings2_request, 'body'),
      ...getShapeAt(indices_get_settings2_request, 'path'),
      ...getShapeAt(indices_get_settings2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_get_settings3_request, 'body'),
      ...getShapeAt(indices_get_settings3_request, 'path'),
      ...getShapeAt(indices_get_settings3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    indices_get_settings_response,
    indices_get_settings1_response,
    indices_get_settings2_response,
    indices_get_settings3_response,
  ]),
};
