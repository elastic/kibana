/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RewriteResponseCase } from '@kbn/actions-types';
import { UpdateRuleBody } from './types';
import { Rule } from '../../types';

const transformUpdateRuleFlapping = (flapping: Rule['flapping']) => {
  if (!flapping) {
    return flapping;
  }

  return {
    flapping: {
      look_back_window: flapping.lookBackWindow,
      status_change_threshold: flapping.statusChangeThreshold,
    },
  };
};

export const transformUpdateRuleBody: RewriteResponseCase<UpdateRuleBody> = ({
  actions = [],
  alertDelay,
  flapping,
  ...res
}): any => ({
  ...res,
  actions: actions.map((action) => {
    const { id, params, uuid } = action;
    return {
      ...('group' in action ? { group: action.group } : {}),
      id,
      params,
      ...('frequency' in action
        ? {
            frequency: action.frequency
              ? {
                  notify_when: action.frequency!.notifyWhen,
                  throttle: action.frequency!.throttle,
                  summary: action.frequency!.summary,
                }
              : undefined,
          }
        : {}),
      ...('alertsFilter' in action ? { alerts_filter: action.alertsFilter } : {}),
      ...('useAlertDataForTemplate' in action &&
      typeof action.useAlertDataForTemplate !== 'undefined'
        ? { use_alert_data_for_template: action.useAlertDataForTemplate }
        : {}),
      ...(uuid && { uuid }),
    };
  }),
  ...(alertDelay ? { alert_delay: alertDelay } : {}),
  ...(flapping !== undefined ? transformUpdateRuleFlapping(flapping) : {}),
});
