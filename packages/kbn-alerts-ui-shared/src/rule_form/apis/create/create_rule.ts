/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { AsApiContract, RewriteResponseCase } from '@kbn/actions-types';
import { RuleFormRule } from '../../types';
import { BASE_ALERTING_API_PATH } from '../../common/constants';
import { transformRule } from '../common_transformations';

export type RuleCreateBody = Omit<RuleFormRule, 'id'>;
const rewriteBodyRequest: RewriteResponseCase<RuleCreateBody> = ({
  ruleTypeId,
  actions,
  alertDelay,
  ...res
}): any => ({
  ...res,
  rule_type_id: ruleTypeId,
  actions: [],
  /* Enable this in the next PR which adds action support *
  actions.map((action) => {
    const { id, params } = action;
    return {
      ...('group' in action && action.group ? { group: action.group } : {}),
      id,
      params,
      ...('frequency' in action && action.frequency
        ? {
            frequency: {
              notify_when: action.frequency!.notifyWhen,
              throttle: action.frequency!.throttle,
              summary: action.frequency!.summary,
            },
          }
        : {}),
      ...('alertsFilter' in action && action.alertsFilter
        ? {
            alerts_filter: action.alertsFilter,
          }
        : {}),
      ...('useAlertDataForTemplate' in action &&
      typeof action.useAlertDataForTemplate !== 'undefined'
        ? { use_alert_data_for_template: action.useAlertDataForTemplate }
        : {}),
    };
  }),
  */
  ...(alertDelay ? { alert_delay: alertDelay } : {}),
});

export async function createRule({
  http,
  rule,
}: {
  http: HttpSetup;
  rule: RuleCreateBody;
}): Promise<RuleFormRule> {
  const res = await http.post<AsApiContract<RuleFormRule>>(`${BASE_ALERTING_API_PATH}/rule`, {
    body: JSON.stringify(rewriteBodyRequest(rule)),
  });
  return transformRule(res);
}
