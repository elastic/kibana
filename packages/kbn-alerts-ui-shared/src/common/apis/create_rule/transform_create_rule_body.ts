/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RewriteResponseCase } from '@kbn/actions-types';
import { CreateRuleBody } from './types';

export const transformCreateRuleBody: RewriteResponseCase<CreateRuleBody> = ({
  ruleTypeId,
  actions = [],
  alertDelay,
  ...res
}): any => ({
  ...res,
  rule_type_id: ruleTypeId,
  actions: actions.map((action) => {
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
  ...(alertDelay ? { alert_delay: alertDelay } : {}),
});
