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
 * Source: /oas_docs/output/kibana.yaml, operations: addCaseFileDefaultSpace
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  add_case_file_default_space_request,
  add_case_file_default_space_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const ADD_CASE_FILE_DEFAULT_SPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.addCaseFileDefaultSpace',
  summary: `Attach a file to a case`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/{caseId}/files</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Attach a file to a case. You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're updating. The request must include:
- The \`Content-Type: multipart/form-data\` HTTP header.
- The location of the file that is being uploaded.
`,
  methods: ['POST'],
  patterns: ['/api/cases/{caseId}/files'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-addcasefiledefaultspace',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['caseId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(add_case_file_default_space_request, 'body'),
    ...getShapeAt(add_case_file_default_space_request, 'path'),
    ...getShapeAt(add_case_file_default_space_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: add_case_file_default_space_response,
};
