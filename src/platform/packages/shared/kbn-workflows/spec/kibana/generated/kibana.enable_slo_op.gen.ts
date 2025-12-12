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
 * Source: /oas_docs/output/kibana.yaml, operations: enableSloOp
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { enable_slo_op_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const ENABLE_SLO_OP_CONTRACT: InternalConnectorContract = {
  type: 'kibana.enableSloOp',
  summary: `Enable an SLO`,
  description: `You must have the \`write\` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.
`,
  methods: ['POST'],
  patterns: ['/s/{spaceId}/api/observability/slos/{sloId}/enable'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-enablesloop',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['spaceId', 'sloId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(enable_slo_op_request, 'body'),
    ...getShapeAt(enable_slo_op_request, 'path'),
    ...getShapeAt(enable_slo_op_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
