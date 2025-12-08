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
 * Source: /oas_docs/output/kibana.yaml, operations: updateCaseCommentDefaultSpace
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  update_case_comment_default_space_request,
  update_case_comment_default_space_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const UPDATE_CASE_COMMENT_DEFAULT_SPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateCaseCommentDefaultSpace',
  summary: `Update a case comment or alert`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're updating. NOTE: You cannot change the comment type or the owner of a comment.
`,
  methods: ['PATCH'],
  patterns: ['/api/cases/{caseId}/comments'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updatecasecommentdefaultspace',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['caseId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(update_case_comment_default_space_request, 'body'),
    ...getShapeAt(update_case_comment_default_space_request, 'path'),
    ...getShapeAt(update_case_comment_default_space_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: update_case_comment_default_space_response,
};
