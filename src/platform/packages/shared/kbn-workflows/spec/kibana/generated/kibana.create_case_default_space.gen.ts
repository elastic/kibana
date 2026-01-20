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
 * Source: /oas_docs/output/kibana.yaml, operations: createCaseDefaultSpace
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  create_case_default_space_request,
  create_case_default_space_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CREATE_CASE_DEFAULT_SPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.createCase',
  summary: `Create a case`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana  feature privileges, depending on the owner of the case you're creating.
`,
  methods: ['POST'],
  patterns: ['/api/cases'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createcasedefaultspace',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'assignees',
      'category',
      'connector',
      'customFields',
      'description',
      'owner',
      'settings',
      'severity',
      'tags',
      'title',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(create_case_default_space_request, 'body'),
    ...getShapeAt(create_case_default_space_request, 'path'),
    ...getShapeAt(create_case_default_space_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: create_case_default_space_response,
};
