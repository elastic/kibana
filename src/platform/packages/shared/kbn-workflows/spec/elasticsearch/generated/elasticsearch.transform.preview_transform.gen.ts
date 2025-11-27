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
 * Generated at: 2025-11-27T07:43:24.925Z
 * Source: elasticsearch-specification repository, operations: transform-preview-transform, transform-preview-transform-1, transform-preview-transform-2, transform-preview-transform-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  transform_preview_transform1_request,
  transform_preview_transform1_response,
  transform_preview_transform2_request,
  transform_preview_transform2_response,
  transform_preview_transform3_request,
  transform_preview_transform3_response,
  transform_preview_transform_request,
  transform_preview_transform_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TRANSFORM_PREVIEW_TRANSFORM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.preview_transform',
  connectorGroup: 'internal',
  summary: `Preview a transform`,
  description: `Preview a transform.

Generates a preview of the results that you will get when you create a transform with the same configuration.

It returns a maximum of 100 results. The calculations are based on all the current data in the source index. It also
generates a list of mappings and settings for the destination index. These values are determined based on the field
types of the source index and the transform aggregations.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-preview-transform`,
  methods: ['GET', 'POST'],
  patterns: ['_transform/{transform_id}/_preview', '_transform/_preview'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-preview-transform',
  parameterTypes: {
    headerParams: [],
    pathParams: ['transform_id'],
    urlParams: ['timeout'],
    bodyParams: [
      'dest',
      'description',
      'frequency',
      'pivot',
      'source',
      'settings',
      'sync',
      'retention_policy',
      'latest',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(transform_preview_transform_request, 'body'),
      ...getShapeAt(transform_preview_transform_request, 'path'),
      ...getShapeAt(transform_preview_transform_request, 'query'),
    }),
    z.object({
      ...getShapeAt(transform_preview_transform1_request, 'body'),
      ...getShapeAt(transform_preview_transform1_request, 'path'),
      ...getShapeAt(transform_preview_transform1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(transform_preview_transform2_request, 'body'),
      ...getShapeAt(transform_preview_transform2_request, 'path'),
      ...getShapeAt(transform_preview_transform2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(transform_preview_transform3_request, 'body'),
      ...getShapeAt(transform_preview_transform3_request, 'path'),
      ...getShapeAt(transform_preview_transform3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    transform_preview_transform_response,
    transform_preview_transform1_response,
    transform_preview_transform2_response,
    transform_preview_transform3_response,
  ]),
};
