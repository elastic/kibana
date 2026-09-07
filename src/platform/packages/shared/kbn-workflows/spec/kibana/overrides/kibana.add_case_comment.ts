/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * OVERRIDE FILE
 *
 * Source: /oas_docs/output/kibana.yaml, operations: addCaseCommentDefaultSpace
 * This override is to support union body with both 'alert' and 'user' comment types.
 */

import { buildParamsSchema } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema, KibanaStepMetaSchema } from '../../schema';
import {
  add_case_comment_default_space_request,
  add_case_comment_default_space_response,
} from '../generated/schemas/kibana_openapi_zod.gen';

// export contract
export const ADD_CASE_COMMENT_CONTRACT: InternalConnectorContract = {
  type: 'kibana.addCaseComment',
  summary: `Add a case comment or alert`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/comments</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're creating. NOTE: Each case can have a maximum of 1,000 alerts.
`,
  methods: ['POST'],
  patterns: ['/api/cases/{caseId}/comments'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-addcasecommentdefaultspace',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['caseId'],
    urlParams: [],
    bodyParams: ['alertId', 'index', 'owner', 'rule', 'type', 'comment'],
  },
  paramsSchema: buildParamsSchema({
    requestSchema: add_case_comment_default_space_request,
    additionalSchemas: {
      fetcher: FetcherConfigSchema,
      ...KibanaStepMetaSchema,
    },
  }),
  outputSchema: add_case_comment_default_space_response,
};
