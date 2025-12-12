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
 * Source: /oas_docs/output/kibana.yaml, operations: setCaseConfigurationDefaultSpace
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  set_case_configuration_default_space_request,
  set_case_configuration_default_space_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const SET_CASE_CONFIGURATION_DEFAULT_SPACE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.setCaseConfigurationDefaultSpace',
  summary: `Add case settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/cases/configure</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Case settings include external connection details, custom fields, and templates. Connectors are used to interface with external systems. You must create a connector before you can use it in your cases. If you set a default connector, it is automatically selected when you create cases in Kibana. If you use the create case API, however, you must still specify all of the connector details. You must have \`all\` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on where you are creating cases.
`,
  methods: ['POST'],
  patterns: ['/api/cases/configure'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-setcaseconfigurationdefaultspace',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['closure_type', 'connector', 'customFields', 'owner', 'templates'],
  },
  paramsSchema: z.object({
    ...getShapeAt(set_case_configuration_default_space_request, 'body'),
    ...getShapeAt(set_case_configuration_default_space_request, 'path'),
    ...getShapeAt(set_case_configuration_default_space_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: set_case_configuration_default_space_response,
};
