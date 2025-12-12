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
 * Source: /oas_docs/output/kibana.yaml, operations: deleteSloInstancesOp
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { delete_slo_instances_op_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const DELETE_SLO_INSTANCES_OP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteSloInstancesOp',
  summary: `Batch delete rollup and summary data`,
  description: `The deletion occurs for the specified list of \`sloId\` and \`instanceId\`. You must have \`all\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['POST'],
  patterns: ['/s/{spaceId}/api/observability/slos/_delete_instances'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletesloinstancesop',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['spaceId'],
    urlParams: [],
    bodyParams: ['list'],
  },
  paramsSchema: z.object({
    ...getShapeAt(delete_slo_instances_op_request, 'body'),
    ...getShapeAt(delete_slo_instances_op_request, 'path'),
    ...getShapeAt(delete_slo_instances_op_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
