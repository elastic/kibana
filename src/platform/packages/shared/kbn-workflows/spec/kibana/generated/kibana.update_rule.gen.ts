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
 * Source: /oas_docs/output/kibana.yaml, operations: UpdateRule
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { update_rule_request, update_rule_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const UPDATE_RULE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateRule',
  summary: `Update a detection rule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a detection rule using the \`rule_id\` or \`id\` field. The original rule is replaced, and all unspecified fields are deleted.

The difference between the \`id\` and \`rule_id\` is that the \`id\` is a unique rule identifier that is randomly generated when a rule is created and cannot be set, whereas \`rule_id\` is a stable rule identifier that can be assigned during rule creation.
> warn
> When used with [API key](https://www.elastic.co/docs/deploy-manage/api-keys) authentication, the user's key gets assigned to the affected rules. If the user's key gets deleted or the user becomes inactive, the rules will stop running.

> If the API key that is used for authorization has different privileges than the key that created or most recently updated the rule, the rule behavior might change.
`,
  methods: ['PUT'],
  patterns: ['/api/detection_engine/rules'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updaterule',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(update_rule_request, 'body'),
    ...getShapeAt(update_rule_request, 'path'),
    ...getShapeAt(update_rule_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: update_rule_response,
};
