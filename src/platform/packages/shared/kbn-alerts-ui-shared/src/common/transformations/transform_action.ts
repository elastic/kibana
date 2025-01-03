/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RewriteRequestCase } from '@kbn/actions-types';
import { RuleUiAction } from '..';

export const transformAction: RewriteRequestCase<RuleUiAction> = (action) => {
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
