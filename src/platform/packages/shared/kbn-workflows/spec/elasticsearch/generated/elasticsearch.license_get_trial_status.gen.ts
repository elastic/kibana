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
 * Source: elasticsearch-specification repository, operations: license-get-trial-status
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  license_get_trial_status_request,
  license_get_trial_status_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const LICENSE_GET_TRIAL_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.license.get_trial_status',
  summary: `Get the trial status`,
  description: `Get the trial status.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-get-trial-status`,
  methods: ['GET'],
  patterns: ['_license/trial_status'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-get-trial-status',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(license_get_trial_status_request, 'body'),
    ...getShapeAt(license_get_trial_status_request, 'path'),
    ...getShapeAt(license_get_trial_status_request, 'query'),
  }),
  outputSchema: license_get_trial_status_response,
};
