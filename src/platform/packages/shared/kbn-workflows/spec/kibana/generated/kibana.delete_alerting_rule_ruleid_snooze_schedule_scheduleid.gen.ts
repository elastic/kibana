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
 * Source: /oas_docs/output/kibana.yaml, operations: delete-alerting-rule-ruleid-snooze-schedule-scheduleid
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { delete_alerting_rule_ruleid_snooze_schedule_scheduleid_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const DELETE_ALERTING_RULE_RULEID_SNOOZE_SCHEDULE_SCHEDULEID_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.delete_alerting_rule_ruleid_snooze_schedule_scheduleid',
    summary: `Delete a snooze schedule for a rule`,
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{ruleId}/snooze_schedule/{scheduleId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
    methods: ['DELETE'],
    patterns: ['/api/alerting/rule/{ruleId}/snooze_schedule/{scheduleId}'],
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete-alerting-rule-ruleid-snooze-schedule-scheduleid',
    parameterTypes: {
      headerParams: ['kbn-xsrf'],
      pathParams: ['ruleId', 'scheduleId'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      ...getShapeAt(delete_alerting_rule_ruleid_snooze_schedule_scheduleid_request, 'body'),
      ...getShapeAt(delete_alerting_rule_ruleid_snooze_schedule_scheduleid_request, 'path'),
      ...getShapeAt(delete_alerting_rule_ruleid_snooze_schedule_scheduleid_request, 'query'),
      fetcher: FetcherConfigSchema,
    }),
    outputSchema: z.optional(z.looseObject({})),
  };
