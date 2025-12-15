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
 * Source: /oas_docs/output/kibana.yaml, operations: getCaseConfigurationDefaultSpace
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  get_case_configuration_default_space_request,
  get_case_configuration_default_space_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const GET_CASE_CONFIGURATION_DEFAULT_SPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getCaseConfigurationDefaultSpace',
  summary: `Get case settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/configure</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get setting details such as the closure type, custom fields, templatse, and the default connector for cases. You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on where the cases were created.
`,
  methods: ['GET'],
  patterns: ['/api/cases/configure'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getcaseconfigurationdefaultspace',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['owner'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(get_case_configuration_default_space_request, 'body'),
    ...getShapeAt(get_case_configuration_default_space_request, 'path'),
    ...getShapeAt(get_case_configuration_default_space_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: get_case_configuration_default_space_response,
};
