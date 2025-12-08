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
 * Source: /oas_docs/output/kibana.yaml, operations: updateCaseConfigurationDefaultSpace
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  update_case_configuration_default_space_request,
  update_case_configuration_default_space_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const UPDATE_CASE_CONFIGURATION_DEFAULT_SPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.updateCaseConfigurationDefaultSpace',
  summary: `Update case settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/configure/{configurationId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Updates setting details such as the closure type, custom fields, templates, and the default connector for cases. Connectors are used to interface with external systems. You must create a connector before you can use it in your cases. You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on where the case was created.
`,
  methods: ['PATCH'],
  patterns: ['/api/cases/configure/{configurationId}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updatecaseconfigurationdefaultspace',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['configurationId'],
    urlParams: [],
    bodyParams: ['closure_type', 'connector', 'customFields', 'templates', 'version'],
  },
  paramsSchema: z.object({
    ...getShapeAt(update_case_configuration_default_space_request, 'body'),
    ...getShapeAt(update_case_configuration_default_space_request, 'path'),
    ...getShapeAt(update_case_configuration_default_space_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: update_case_configuration_default_space_response,
};
