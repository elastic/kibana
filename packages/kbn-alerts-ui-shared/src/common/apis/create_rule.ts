/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { AsApiContract, RewriteResponseCase } from '@kbn/actions-types';
import type { Rule } from '@kbn/alerting-types';
import type { RuleFormData } from '../../rule_form';
import { BASE_ALERTING_API_PATH } from '../constants';
import { transformRule } from '../utils';

export const rewriteCreateBodyRequest: RewriteResponseCase<RuleFormData> = ({
  ruleTypeId,
  alertDelay,
  ...res
}): any => ({
  ...res,
  rule_type_id: ruleTypeId,
  actions: [],
  ...(alertDelay ? { alert_delay: alertDelay } : {}),
});

export async function createRule({
  http,
  rule,
}: {
  http: HttpSetup;
  rule: RuleFormData;
}): Promise<Rule> {
  const res = await http.post<AsApiContract<Rule>>(`${BASE_ALERTING_API_PATH}/rule`, {
    body: JSON.stringify(rewriteCreateBodyRequest(rule)),
  });
  return transformRule(res);
}
