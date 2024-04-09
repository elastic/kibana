/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { pick } from 'lodash';
import { RewriteResponseCase, AsApiContract } from '@kbn/actions-plugin/common';
import { BASE_ALERTING_API_PATH } from '../../common/constants';
import { Rule, RuleUpdates } from '../../../types';
import { transformRule } from '../common_transformations';

type RuleUpdatesBody = Pick<
  RuleUpdates,
  'name' | 'tags' | 'schedule' | 'actions' | 'params' | 'throttle' | 'notifyWhen' | 'alertDelay'
>;
const rewriteBodyRequest: RewriteResponseCase<RuleUpdatesBody> = ({
  actions,
  alertDelay,
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
});

export async function updateRule({
  http,
  rule,
  id,
}: {
  http: HttpSetup;
  rule: Pick<RuleUpdates, 'name' | 'tags' | 'schedule' | 'params' | 'actions' | 'alertDelay'>;
  id: string;
}): Promise<Rule> {
  const res = await http.put<AsApiContract<Rule>>(
    `${BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}`,
    {
      body: JSON.stringify(
        rewriteBodyRequest(
          pick(rule, ['name', 'tags', 'schedule', 'params', 'actions', 'alertDelay'])
        )
      ),
    }
  );
  return transformRule(res);
}
