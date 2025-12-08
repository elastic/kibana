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
 * Source: /oas_docs/output/kibana.yaml, operations: get-parameters
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { get_parameters_request, get_parameters_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const GET_PARAMETERS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.get_parameters',
  summary: `Get parameters`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/synthetics/params</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all parameters. You must have \`read\` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.
`,
  methods: ['GET'],
  patterns: ['/api/synthetics/params'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-parameters',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(get_parameters_request, 'body'),
    ...getShapeAt(get_parameters_request, 'path'),
    ...getShapeAt(get_parameters_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: get_parameters_response,
};
