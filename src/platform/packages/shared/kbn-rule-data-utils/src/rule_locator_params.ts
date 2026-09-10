/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';

export const ruleDetailsLocatorID = 'RULE_DETAILS_LOCATOR';
export const rulesLocatorID = 'RULES_LOCATOR';

export type RuleDetailsTabId = 'alerts' | 'history';
export type RuleStatus = 'enabled' | 'disabled' | 'snoozed';

export const RULE_DETAILS_ALERTS_TAB: RuleDetailsTabId = 'alerts';
export const RULE_DETAILS_HISTORY_TAB: RuleDetailsTabId = 'history';

/**
 * Identifies the host app and base path for v1 rule locators so the same
 * locator resolves to different URL trees depending on which app mounts the
 * classic rules page (Stack Management, Observability, etc.).
 */
export interface RulesLocatorHost extends SerializableRecord {
  app: string;
  basePath: string;
}

export const RULES_MANAGEMENT_HOST: RulesLocatorHost = {
  app: 'management',
  basePath: '/insightsAndAlerting/triggersActions',
};

export interface RuleDetailsLocatorParams extends SerializableRecord {
  ruleId: string;
  tabId?: RuleDetailsTabId;
  rangeFrom?: string;
  rangeTo?: string;
  kuery?: string;
  controlConfigs?: SerializableRecord[];
  host?: RulesLocatorHost;
}

export interface RulesLocatorParams extends SerializableRecord {
  lastResponse?: string[];
  params?: Record<string, string | number>;
  search?: string;
  status?: RuleStatus[];
  type?: string[];
  host?: RulesLocatorHost;
}
