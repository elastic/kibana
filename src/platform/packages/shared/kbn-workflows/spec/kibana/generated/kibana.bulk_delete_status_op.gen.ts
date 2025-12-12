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
 * Source: /oas_docs/output/kibana.yaml, operations: bulkDeleteStatusOp
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  bulk_delete_status_op_request,
  bulk_delete_status_op_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const BULK_DELETE_STATUS_OP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.bulkDeleteStatusOp',
  summary: `Retrieve the status of the bulk deletion`,
  description: `Retrieve the status of the bulk deletion operation for SLOs.  This endpoint returns the status of the bulk deletion operation, including whether it is completed and the results of the operation.
`,
  methods: ['GET'],
  patterns: ['/s/{spaceId}/api/observability/slos/_bulk_delete/{taskId}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-bulkdeletestatusop',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['spaceId', 'taskId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(bulk_delete_status_op_request, 'body'),
    ...getShapeAt(bulk_delete_status_op_request, 'path'),
    ...getShapeAt(bulk_delete_status_op_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: bulk_delete_status_op_response,
};
