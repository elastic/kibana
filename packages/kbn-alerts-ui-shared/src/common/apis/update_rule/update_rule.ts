/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpSetup } from '@kbn/core/public';
import { pick } from 'lodash';
import { AsApiContract } from '@kbn/actions-types';
import { UpdateRuleBody } from './types';
import { BASE_ALERTING_API_PATH } from '../../constants';
import { transformUpdateRuleBody } from './transform_update_rule_body';
import { transformRule } from '../../transformations';
import { Rule } from '../../types';

export const UPDATE_FIELDS: Array<keyof UpdateRuleBody> = [
  'name',
  'tags',
  'schedule',
  'params',
  'alertDelay',
  'flapping',
];

export const UPDATE_FIELDS_WITH_ACTIONS: Array<keyof UpdateRuleBody> = [
  'name',
  'tags',
  'schedule',
  'params',
  'alertDelay',
  'actions',
  'flapping',
];

export async function updateRule({
  http,
  rule,
  id,
}: {
  http: HttpSetup;
  rule: UpdateRuleBody;
  id: string;
}): Promise<Rule> {
  const res = await http.put<AsApiContract<Rule>>(
    `${BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}`,
    {
      body: JSON.stringify(transformUpdateRuleBody(pick(rule, UPDATE_FIELDS_WITH_ACTIONS))),
    }
  );
  return transformRule(res);
}
