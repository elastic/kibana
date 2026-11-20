/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Capabilities } from '@kbn/core-capabilities-common';
import {
  STACK_ALERTS_FEATURE_ID,
  STACK_ALERTS_ONLY_FEATURE_ID,
  STACK_ALERTS_SHOW_UI_CAPABILITY,
} from './rule_types/stack_rules';

/** UI capability for the Stack Management Rules page. */
export const TRIGGERS_ACTIONS_RULES_CAPABILITY_ID = 'triggersActionsRules' as const;

export const canAccessTriggersActionsRules = (capabilities: Capabilities): boolean =>
  Boolean(capabilities.management?.insightsAndAlerting?.[TRIGGERS_ACTIONS_RULES_CAPABILITY_ID]);

/** Observability app ids granted together with classic rule and alert read. */
export const OBSERVABILITY_SOLUTION_NAV_LINK_IDS = [
  'apm',
  'metrics',
  'uptime',
  'synthetics',
  'slo',
] as const;

const LOGS_FEATURE_ID = 'logs';
const DATA_QUALITY_FEATURE_ID = 'dataQuality';
const OBSERVABILITY_ALERTS_FEATURE_ID = 'observabilityAlerts';
const FEATURE_UI_SHOW = 'show';
const ML_APP_ID = 'ml';

const hasFeatureUi = (
  capabilities: Capabilities,
  featureId: string,
  uiCapability: string
): boolean => capabilities[featureId]?.[uiCapability] === true;

/** True when a Kibana privilege grants read access to a classic rule under the alerts consumer. */
export const hasClassicRulesReadCapability = (capabilities: Capabilities): boolean => {
  const { navLinks } = capabilities;

  return (
    OBSERVABILITY_SOLUTION_NAV_LINK_IDS.some((appId) => navLinks?.[appId] === true) ||
    hasFeatureUi(capabilities, LOGS_FEATURE_ID, FEATURE_UI_SHOW) ||
    hasFeatureUi(capabilities, STACK_ALERTS_FEATURE_ID, STACK_ALERTS_SHOW_UI_CAPABILITY) ||
    navLinks?.[ML_APP_ID] === true ||
    hasFeatureUi(capabilities, DATA_QUALITY_FEATURE_ID, FEATURE_UI_SHOW)
  );
};

/** True when a Kibana privilege grants read access to at least one classic alert. */
export const hasClassicAlertsReadCapability = (capabilities: Capabilities): boolean =>
  hasClassicRulesReadCapability(capabilities) ||
  hasFeatureUi(capabilities, OBSERVABILITY_ALERTS_FEATURE_ID, FEATURE_UI_SHOW) ||
  hasFeatureUi(capabilities, STACK_ALERTS_ONLY_FEATURE_ID, FEATURE_UI_SHOW);
