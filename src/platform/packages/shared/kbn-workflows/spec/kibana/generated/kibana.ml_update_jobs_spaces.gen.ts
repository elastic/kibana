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
 * Source: /oas_docs/output/kibana.yaml, operations: mlUpdateJobsSpaces
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_update_jobs_spaces_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const ML_UPDATE_JOBS_SPACES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.mlUpdateJobsSpaces',
  summary: `Update jobs spaces`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/ml/saved_objects/update_jobs_spaces</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a list of jobs to add and/or remove them from given spaces.`,
  methods: ['POST'],
  patterns: ['/api/ml/saved_objects/update_jobs_spaces'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-mlupdatejobsspaces',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_update_jobs_spaces_request, 'body'),
    ...getShapeAt(ml_update_jobs_spaces_request, 'path'),
    ...getShapeAt(ml_update_jobs_spaces_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
