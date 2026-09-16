/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { TRIGGERS_ACTIONS_MANAGEMENT_PATH } from './routes/stack_rule_paths';

export const ruleDetailsLocatorID = 'RULE_DETAILS_LOCATOR';
export const rulesLocatorID = 'RULES_LOCATOR';

export type RuleDetailsTabId = 'alerts' | 'history';
export type RuleStatus = 'enabled' | 'disabled' | 'snoozed';

export const RULE_DETAILS_ALERTS_TAB: RuleDetailsTabId = 'alerts';
export const RULE_DETAILS_HISTORY_TAB: RuleDetailsTabId = 'history';

/**
 * Identifies the Kibana app and in-app path prefix so the same locator
 * resolves to different URL trees depending on which app mounts the page
 * (Stack Management, Observability, etc.).
 *
 * `pathPrefix` is an in-app path, not `core.http.basePath`.
 */
export interface LocatorHost extends SerializableRecord {
  app: string;
  pathPrefix: string;
}

export const STACK_MANAGEMENT_RULES_HOST: LocatorHost = {
  app: 'management',
  pathPrefix: `/${TRIGGERS_ACTIONS_MANAGEMENT_PATH}`,
};

export interface RuleDetailsLocatorParams extends SerializableRecord {
  ruleId: string;
  tabId?: RuleDetailsTabId;
  rangeFrom?: string;
  rangeTo?: string;
  kuery?: string;
  controlConfigs?: SerializableRecord[];
  host?: LocatorHost;
}

export interface RulesLocatorParams extends SerializableRecord {
  lastResponse?: string[];
  params?: Record<string, string | number>;
  search?: string;
  status?: RuleStatus[];
  type?: string[];
  host?: LocatorHost;
}
