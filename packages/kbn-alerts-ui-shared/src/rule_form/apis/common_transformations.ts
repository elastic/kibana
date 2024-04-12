/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AsApiContract, RewriteRequestCase } from '@kbn/actions-types';
import type { RuleFormRule, RuleUiAction } from '../types';

const transformAction: RewriteRequestCase<RuleUiAction> = (action) => {
  const { uuid, id, connector_type_id: actionTypeId, params } = action;
  return {
    ...('group' in action && action.group ? { group: action.group } : {}),
    id,
    params,
    actionTypeId,
    ...('use_alert_data_for_template' in action &&
    typeof action.use_alert_data_for_template !== 'undefined'
      ? { useAlertDataForTemplate: action.use_alert_data_for_template }
      : {}),
    ...('frequency' in action && action.frequency
      ? {
          frequency: {
            summary: action.frequency.summary,
            notifyWhen: action.frequency.notify_when,
            throttle: action.frequency.throttle,
          },
        }
      : {}),
    ...('alerts_filter' in action && action.alerts_filter
      ? { alertsFilter: action.alerts_filter }
      : {}),
    ...(uuid && { uuid }),
  };
};

export const transformRule: RewriteRequestCase<RuleFormRule> = ({
  rule_type_id: ruleTypeId,
  actions: actions,
  alert_delay: alertDelay,
  ...rest
}: any) => ({
  ruleTypeId,
  actions: actions
    ? actions.map((action: AsApiContract<RuleUiAction>) => transformAction(action))
    : [],
  ...(alertDelay ? { alertDelay } : {}),
  ...rest,
});

export const transformResolvedRule: RewriteRequestCase<RuleFormRule> = ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  alias_target_id,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  alias_purpose,
  outcome,
  ...rest
}: any) => {
  return {
    ...transformRule(rest),
    alias_target_id,
    alias_purpose,
    outcome,
  };
};
