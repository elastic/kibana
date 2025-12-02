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
 * Source: /oas_docs/output/kibana.yaml, operations: put-synthetic-monitor
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { put_synthetic_monitor_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PUT_SYNTHETIC_MONITOR_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_synthetic_monitor',
  summary: `Update a monitor`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/monitors/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a monitor with the specified attributes. The required and default fields may vary based on the monitor type.
You must have \`all\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
You can also partially update a monitor. This will only update the fields that are specified in the request body. All other fields are left unchanged. The specified fields should conform to the monitor type. For example, you can't update the \`inline_scipt\` field of a HTTP monitor.
`,
  methods: ['PUT'],
  patterns: ['/api/synthetics/monitors/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put-synthetic-monitor',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(put_synthetic_monitor_request, 'body'),
    ...getShapeAt(put_synthetic_monitor_request, 'path'),
    ...getShapeAt(put_synthetic_monitor_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
