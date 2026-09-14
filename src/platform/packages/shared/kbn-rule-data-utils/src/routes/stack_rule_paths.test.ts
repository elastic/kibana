/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { STACK_MANAGEMENT_RULES_HOST } from '../rule_locator_params';
import {
  getCreateRuleFromTemplateRoute,
  getCreateRuleRoute,
  getEditRuleRoute,
  getRuleDetailsRoute,
  getTriggersActionsManagementPath,
  TRIGGERS_ACTIONS_MANAGEMENT_PATH,
  triggersActionsRoute,
} from './stack_rule_paths';

describe('getTriggersActionsManagementPath', () => {
  it('joins a leading-slash route without a double slash', () => {
    expect(getTriggersActionsManagementPath(getCreateRuleFromTemplateRoute('tmpl-1'))).toBe(
      `${TRIGGERS_ACTIONS_MANAGEMENT_PATH}/create/template/tmpl-1`
    );
    expect(getTriggersActionsManagementPath(getCreateRuleRoute('.es-query'))).toBe(
      `${TRIGGERS_ACTIONS_MANAGEMENT_PATH}/create/.es-query`
    );
    expect(getTriggersActionsManagementPath(getEditRuleRoute('rule-1'))).toBe(
      `${TRIGGERS_ACTIONS_MANAGEMENT_PATH}/edit/rule-1`
    );
    expect(getTriggersActionsManagementPath(getRuleDetailsRoute('rule-1'))).toBe(
      `${TRIGGERS_ACTIONS_MANAGEMENT_PATH}/rule/rule-1`
    );
  });

  it('inserts a slash when the route has none', () => {
    expect(getTriggersActionsManagementPath('create/.es-query')).toBe(
      `${TRIGGERS_ACTIONS_MANAGEMENT_PATH}/create/.es-query`
    );
  });
});

describe('STACK_MANAGEMENT_RULES_HOST', () => {
  it('composes pathPrefix from TRIGGERS_ACTIONS_MANAGEMENT_PATH', () => {
    expect(STACK_MANAGEMENT_RULES_HOST).toEqual({
      app: 'management',
      pathPrefix: `/${TRIGGERS_ACTIONS_MANAGEMENT_PATH}`,
    });
    expect(triggersActionsRoute).toBe(`/app/management/${TRIGGERS_ACTIONS_MANAGEMENT_PATH}`);
  });
});
