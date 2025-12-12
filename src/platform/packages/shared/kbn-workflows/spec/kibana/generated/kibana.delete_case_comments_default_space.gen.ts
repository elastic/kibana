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
 * Source: /oas_docs/output/kibana.yaml, operations: deleteCaseCommentsDefaultSpace
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { delete_case_comments_default_space_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const DELETE_CASE_COMMENTS_DEFAULT_SPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.deleteCaseCommentsDefaultSpace',
  summary: `Delete all case comments and alerts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Deletes all comments and alerts from a case. You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases you're deleting.
`,
  methods: ['DELETE'],
  patterns: ['/api/cases/{caseId}/comments'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletecasecommentsdefaultspace',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['caseId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(delete_case_comments_default_space_request, 'body'),
    ...getShapeAt(delete_case_comments_default_space_request, 'path'),
    ...getShapeAt(delete_case_comments_default_space_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
