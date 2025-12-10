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
 * Source: /oas_docs/output/kibana.yaml, operations: put-private-location
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  put_private_location_request,
  put_private_location_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PUT_PRIVATE_LOCATION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_private_location',
  summary: `Update a private location`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/private_locations/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing private location's label.
You must have \`all\` privileges for the Synthetics and Uptime feature in the Observability section of the Kibana feature privileges.
When a private location's label is updated, all monitors using this location will also be updated to maintain data consistency.
`,
  methods: ['PUT'],
  patterns: ['/api/synthetics/private_locations/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put-private-location',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['label'],
  },
  paramsSchema: z.object({
    ...getShapeAt(put_private_location_request, 'body'),
    ...getShapeAt(put_private_location_request, 'path'),
    ...getShapeAt(put_private_location_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: put_private_location_response,
};
