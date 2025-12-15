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
 * Source: /oas_docs/output/kibana.yaml, operations: CreateExceptionList
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  create_exception_list_request,
  create_exception_list_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CREATE_EXCEPTION_LIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CreateExceptionList',
  summary: `Create an exception list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

An exception list groups exception items and can be associated with detection rules. You can assign exception lists to multiple detection rules.
> info
> All exception items added to the same list are evaluated using \`OR\` logic. That is, if any of the items in a list evaluate to \`true\`, the exception prevents the rule from generating an alert. Likewise, \`OR\` logic is used for evaluating exceptions when more than one exception list is assigned to a rule. To use the \`AND\` operator, you can define multiple clauses (\`entries\`) in a single exception item.
`,
  methods: ['POST'],
  patterns: ['/api/exception_lists'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-createexceptionlist',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'description',
      'list_id',
      'meta',
      'name',
      'namespace_type',
      'os_types',
      'tags',
      'type',
      'version',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(create_exception_list_request, 'body'),
    ...getShapeAt(create_exception_list_request, 'path'),
    ...getShapeAt(create_exception_list_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: create_exception_list_response,
};
