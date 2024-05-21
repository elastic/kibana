/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RuleFormData } from './types';

export const DEFAULT_RULE_INTERVAL = '1m';

export const GET_DEFAULT_FORM_DATA = ({
  ruleTypeId,
  name,
}: {
  ruleTypeId: RuleFormData['ruleTypeId'];
  name: RuleFormData['name'];
}) => {
  return {
    tags: [],
    params: {},
    schedule: {
      interval: DEFAULT_RULE_INTERVAL,
    },
    consumer: 'alerts',
    ruleTypeId,
    name,
  };
};

export const createRuleRoute = '/rule/create/:ruleTypeId' as const;
export const editRuleRoute = '/rule/edit/:id' as const;
