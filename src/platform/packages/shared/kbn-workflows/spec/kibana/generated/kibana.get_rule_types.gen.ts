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
 * Source: /oas_docs/output/kibana.yaml, operations: getRuleTypes
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { get_rule_types_request, get_rule_types_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const GET_RULE_TYPES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.getRuleTypes',
  summary: `Get the rule types`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule_types</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

If you have \`read\` privileges for one or more Kibana features, the API response contains information about the appropriate rule types. For example, there are rule types associated with the **Management > Stack Rules** feature, **Analytics > Discover** and **Machine Learning** features, **Observability** features, and **Security** features. To get rule types associated with the **Stack Monitoring** feature, use the \`monitoring_user\` built-in role.
`,
  methods: ['GET'],
  patterns: ['/api/alerting/rule_types'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getruletypes',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(get_rule_types_request, 'body'),
    ...getShapeAt(get_rule_types_request, 'path'),
    ...getShapeAt(get_rule_types_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: get_rule_types_response,
};
