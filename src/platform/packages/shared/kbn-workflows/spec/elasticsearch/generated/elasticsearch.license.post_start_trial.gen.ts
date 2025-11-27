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
 * Generated at: 2025-11-27T07:43:24.893Z
 * Source: elasticsearch-specification repository, operations: license-post-start-trial
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  license_post_start_trial_request,
  license_post_start_trial_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const LICENSE_POST_START_TRIAL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.license.post_start_trial',
  connectorGroup: 'internal',
  summary: `Start a trial`,
  description: `Start a trial.

Start a 30-day trial, which gives access to all subscription features.

NOTE: You are allowed to start a trial only if your cluster has not already activated a trial for the current major product version.
For example, if you have already activated a trial for v8.0, you cannot start a new trial until v9.0. You can, however, request an extended trial at https://www.elastic.co/trialextension.

To check the status of your trial, use the get trial status API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-post-start-trial`,
  methods: ['POST'],
  patterns: ['_license/start_trial'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-post-start-trial',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['acknowledge', 'type', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(license_post_start_trial_request, 'body'),
    ...getShapeAt(license_post_start_trial_request, 'path'),
    ...getShapeAt(license_post_start_trial_request, 'query'),
  }),
  outputSchema: license_post_start_trial_response,
};
