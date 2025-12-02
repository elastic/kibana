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
 * Source: /oas_docs/output/kibana.yaml, operations: post-alerting-rule-rule-id-alert-alert-id-unmute
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { post_alerting_rule_rule_id_alert_alert_id_unmute_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_ALERTING_RULE_RULE_ID_ALERT_ALERT_ID_UNMUTE_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.post_alerting_rule_rule_id_alert_alert_id_unmute',
    summary: `Unmute an alert`,
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/alerting/rule/{rule_id}/alert/{alert_id}/_unmute</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
    methods: ['POST'],
    patterns: ['/api/alerting/rule/{rule_id}/alert/{alert_id}/_unmute'],
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-alerting-rule-rule-id-alert-alert-id-unmute',
    parameterTypes: {
      headerParams: ['kbn-xsrf'],
      pathParams: ['rule_id', 'alert_id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      ...getShapeAt(post_alerting_rule_rule_id_alert_alert_id_unmute_request, 'body'),
      ...getShapeAt(post_alerting_rule_rule_id_alert_alert_id_unmute_request, 'path'),
      ...getShapeAt(post_alerting_rule_rule_id_alert_alert_id_unmute_request, 'query'),
      fetcher: FetcherConfigSchema,
    }),
    outputSchema: z.optional(z.looseObject({})),
  };
