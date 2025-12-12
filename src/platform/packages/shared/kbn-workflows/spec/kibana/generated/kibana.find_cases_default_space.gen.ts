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
 * Source: /oas_docs/output/kibana.yaml, operations: findCasesDefaultSpace
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  find_cases_default_space_request,
  find_cases_default_space_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const FIND_CASES_DEFAULT_SPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.findCasesDefaultSpace',
  summary: `Search cases`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`read\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're seeking.
`,
  methods: ['GET'],
  patterns: ['/api/cases/_find'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findcasesdefaultspace',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'assignees',
      'category',
      'defaultSearchOperator',
      'from',
      'owner',
      'page',
      'perPage',
      'reporters',
      'search',
      'searchFields',
      'severity',
      'sortField',
      'sortOrder',
      'status',
      'tags',
      'to',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(find_cases_default_space_request, 'body'),
    ...getShapeAt(find_cases_default_space_request, 'path'),
    ...getShapeAt(find_cases_default_space_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: find_cases_default_space_response,
};
