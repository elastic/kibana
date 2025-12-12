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
 * Source: elasticsearch-specification repository, operations: ml-preview-datafeed, ml-preview-datafeed-1, ml-preview-datafeed-2, ml-preview-datafeed-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_preview_datafeed1_request,
  ml_preview_datafeed1_response,
  ml_preview_datafeed2_request,
  ml_preview_datafeed2_response,
  ml_preview_datafeed3_request,
  ml_preview_datafeed3_response,
  ml_preview_datafeed_request,
  ml_preview_datafeed_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_PREVIEW_DATAFEED_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.preview_datafeed',
  summary: `Preview a datafeed`,
  description: `Preview a datafeed.

This API returns the first "page" of search results from a datafeed.
You can preview an existing datafeed or provide configuration details for a datafeed
and anomaly detection job in the API. The preview shows the structure of the data
that will be passed to the anomaly detection engine.
IMPORTANT: When Elasticsearch security features are enabled, the preview uses the credentials of the user that
called the API. However, when the datafeed starts it uses the roles of the last user that created or updated the
datafeed. To get a preview that accurately reflects the behavior of the datafeed, use the appropriate credentials.
You can also use secondary authorization headers to supply the credentials.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-preview-datafeed`,
  methods: ['GET', 'POST'],
  patterns: ['_ml/datafeeds/{datafeed_id}/_preview', '_ml/datafeeds/_preview'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-preview-datafeed',
  parameterTypes: {
    headerParams: [],
    pathParams: ['datafeed_id'],
    urlParams: ['start', 'end'],
    bodyParams: ['datafeed_config', 'job_config'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_preview_datafeed_request, 'body'),
      ...getShapeAt(ml_preview_datafeed_request, 'path'),
      ...getShapeAt(ml_preview_datafeed_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_preview_datafeed1_request, 'body'),
      ...getShapeAt(ml_preview_datafeed1_request, 'path'),
      ...getShapeAt(ml_preview_datafeed1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_preview_datafeed2_request, 'body'),
      ...getShapeAt(ml_preview_datafeed2_request, 'path'),
      ...getShapeAt(ml_preview_datafeed2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_preview_datafeed3_request, 'body'),
      ...getShapeAt(ml_preview_datafeed3_request, 'path'),
      ...getShapeAt(ml_preview_datafeed3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    ml_preview_datafeed_response,
    ml_preview_datafeed1_response,
    ml_preview_datafeed2_response,
    ml_preview_datafeed3_response,
  ]),
};
