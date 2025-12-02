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
 * Source: /oas_docs/output/kibana.yaml, operations: bulkDeleteOp
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { bulk_delete_op_request, bulk_delete_op_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const BULK_DELETE_OP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkDeleteOp',
  summary: `Bulk delete SLO definitions and their associated summary and rollup data.`,
  description: `Bulk delete SLO definitions and their associated summary and rollup data.  This endpoint initiates a bulk deletion operation for SLOs, which may take some time to complete.  The status of the operation can be checked using the \`GET /api/slo/_bulk_delete/{taskId}\` endpoint.
`,
  methods: ['POST'],
  patterns: ['/s/{spaceId}/api/observability/slos/_bulk_delete'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-bulkdeleteop',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['spaceId'],
    urlParams: [],
    bodyParams: ['list'],
  },
  paramsSchema: z.object({
    ...getShapeAt(bulk_delete_op_request, 'body'),
    ...getShapeAt(bulk_delete_op_request, 'path'),
    ...getShapeAt(bulk_delete_op_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: bulk_delete_op_response,
};
