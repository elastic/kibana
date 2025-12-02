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
 * Source: /oas_docs/output/kibana.yaml, operations: PerformRulesBulkAction
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  perform_rules_bulk_action_request,
  perform_rules_bulk_action_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PERFORM_RULES_BULK_ACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PerformRulesBulkAction',
  summary: `Apply a bulk action to detection rules`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/_bulk_action</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Apply a bulk action, such as bulk edit, duplicate, or delete, to multiple detection rules. The bulk action is applied to all rules that match the query or to the rules listed by their IDs.

The edit action allows you to add, delete, or set tags, index patterns, investigation fields, rule actions and schedules for multiple rules at once. 
The edit action is idempotent, meaning that if you add a tag to a rule that already has that tag, no changes are made. The same is true for other edit actions, for example removing an index pattern that is not specified in a rule will not result in any changes. The only exception is the \`add_rule_actions\` and \`set_rule_actions\` action, which is non-idempotent. This means that if you add or set a rule action to a rule that already has that action, a new action is created with a new unique ID.
> warn
> When used with [API key](https://www.elastic.co/docs/deploy-manage/api-keys) authentication, the user's key gets assigned to the affected rules. If the user's key gets deleted or the user becomes inactive, the rules will stop running.

> If the API key that is used for authorization has different privileges than the key that created or most recently updated the rule, the rule behavior might change.
`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/rules/_bulk_action'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-performrulesbulkaction',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['dry_run'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(perform_rules_bulk_action_request, 'body'),
    ...getShapeAt(perform_rules_bulk_action_request, 'path'),
    ...getShapeAt(perform_rules_bulk_action_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: perform_rules_bulk_action_response,
};
