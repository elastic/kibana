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
 * Source: /oas_docs/output/kibana.yaml, operations: mlSync
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_sync_request, ml_sync_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const ML_SYNC_CONTRACT: InternalConnectorContract = {
  type: 'kibana.mlSync',
  summary: `Sync saved objects in the default space`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/ml/saved_objects/sync</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Synchronizes Kibana saved objects for machine learning jobs and trained models in the default space. You must have \`all\` privileges for the **Machine Learning** feature in the **Analytics** section of the Kibana feature privileges. This API runs automatically when you start Kibana and periodically thereafter.
`,
  methods: ['GET'],
  patterns: ['/api/ml/saved_objects/sync'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-mlsync',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['simulate'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_sync_request, 'body'),
    ...getShapeAt(ml_sync_request, 'path'),
    ...getShapeAt(ml_sync_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: ml_sync_response,
};
