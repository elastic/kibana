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
 * Source: /oas_docs/output/kibana.yaml, operations: delete-fleet-enrollment-api-keys-keyid
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  delete_fleet_enrollment_api_keys_keyid_request,
  delete_fleet_enrollment_api_keys_keyid_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const DELETE_FLEET_ENROLLMENT_API_KEYS_KEYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_fleet_enrollment_api_keys_keyid',
  summary: `Revoke an enrollment API key`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/fleet/enrollment_api_keys/{keyId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Revoke an enrollment API key by ID by marking it as inactive.<br/><br/>[Required authorization] Route required privileges: fleet-agents-all.`,
  methods: ['DELETE'],
  patterns: ['/api/fleet/enrollment_api_keys/{keyId}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete-fleet-enrollment-api-keys-keyid',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['keyId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(delete_fleet_enrollment_api_keys_keyid_request, 'body'),
    ...getShapeAt(delete_fleet_enrollment_api_keys_keyid_request, 'path'),
    ...getShapeAt(delete_fleet_enrollment_api_keys_keyid_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: delete_fleet_enrollment_api_keys_keyid_response,
};
