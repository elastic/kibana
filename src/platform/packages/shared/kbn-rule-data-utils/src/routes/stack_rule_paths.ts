/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const ruleDetailsRoute = '/rule/:ruleId' as const;
export const createRuleRoute = '/create/:ruleTypeId' as const;
export const createRuleFromTemplateRoute = '/create/template/:templateId' as const;
export const editRuleRoute = '/edit/:id' as const;
export const rulesAppDetailsRoute = '/rule/:ruleId' as const;
export const ruleLogsRoute = '/logs' as const;
/** Stack Management section id that owns classic (v1) Rules. */
export const TRIGGERS_ACTIONS_SECTION_ID = 'insightsAndAlerting' as const;
/** Management app id for classic (v1) Rules (`PLUGIN_ID` in triggers_actions_ui). */
export const TRIGGERS_ACTIONS_APP_ID = 'triggersActions' as const;
export const TRIGGERS_ACTIONS_MANAGEMENT_PATH =
  `${TRIGGERS_ACTIONS_SECTION_ID}/${TRIGGERS_ACTIONS_APP_ID}` as const;
export const triggersActionsRoute = `/app/management/${TRIGGERS_ACTIONS_MANAGEMENT_PATH}` as const;
export const rulesAppRoute = '/app/rules' as const;

export const getRuleDetailsRoute = (ruleId: string) => ruleDetailsRoute.replace(':ruleId', ruleId);
export const getRulesAppDetailsRoute = (ruleId: string) =>
  rulesAppDetailsRoute.replace(':ruleId', ruleId);
export const getCreateRuleRoute = (ruleTypeId: string) =>
  createRuleRoute.replace(':ruleTypeId', ruleTypeId);
export const getCreateRuleFromTemplateRoute = (templateId: string) =>
  createRuleFromTemplateRoute.replace(':templateId', templateId);
export const getEditRuleRoute = (ruleId: string) => editRuleRoute.replace(':id', ruleId);

/**
 * Management app `path` for a classic v1 Rules sub-route.
 * Route helpers already include a leading slash; joining with another `/` produces `//create`.
 */
export const getTriggersActionsManagementPath = (route: string): string =>
  `${TRIGGERS_ACTIONS_MANAGEMENT_PATH}${route.startsWith('/') ? route : `/${route}`}`;
