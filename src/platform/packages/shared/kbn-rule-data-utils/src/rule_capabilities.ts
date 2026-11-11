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

/**
 * UI capability key under `capabilities.management.insightsAndAlerting` granting access to the
 * Stack Management Rules page served by `triggers_actions_ui` at `triggersActionsRoute`.
 */
export const TRIGGERS_ACTIONS_RULES_CAPABILITY_ID = 'triggersActionsRules' as const;

export const canAccessTriggersActionsRules = (capabilities: Capabilities): boolean =>
  Boolean(capabilities.management?.insightsAndAlerting?.[TRIGGERS_ACTIONS_RULES_CAPABILITY_ID]);

/**
 * Observability apps whose nav link is granted with classic rule and alert read.
 * `hasObservabilityCapabilities` uses the same list.
 */
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

/**
 * Machine Learning app id. The license switcher clears `ml.canUseMlAlerts` without
 * removing the ML app privilege, so visibility follows `navLinks.ml`. Nav links are
 * copied from a privilege's `app` list. The APM sub-privilege registers `app: []`
 * (`getPluginPrivileges` in `@kbn/ml-common-types`).
 */
const ML_APP_ID = 'ml';

/**
 * Security rules feature ids that are still registered. Each grants `read_rules`
 * together with classic rule read and `triggersActionsAlerts`. Older ids stay so
 * unmigrated roles keep the Observability Rules and Alerts links.
 *
 * These ids, plus logs, dataQuality, observabilityAlerts, the ML nav link, and
 * stackAlertsOnly, are a hardcoded list. A feature that grants triggersActionsRules
 * and is missing here drops out of the nav with no failure. Drift-guard tests are
 * tracked in https://github.com/elastic/kibana/issues/304874.
 */
const SECURITY_RULES_FEATURE_IDS = [
  'securitySolutionRulesV1',
  'securitySolutionRulesV2',
  'securitySolutionRulesV3',
  'securitySolutionRulesV4',
] as const;

const SECURITY_RULES_READ_UI_CAPABILITY = 'read_rules';

const hasNavLink = (capabilities: Capabilities, appId: string): boolean =>
  capabilities.navLinks?.[appId] === true;

const hasFeatureUi = (
  capabilities: Capabilities,
  featureId: string,
  uiCapability: string
): boolean => capabilities[featureId]?.[uiCapability] === true;

/**
 * Privileges that grant both classic rule read and classic alert read.
 * Alert-only privileges are not included; see `hasClassicAlertsReadCapability`.
 */
const hasSolutionRuleAndAlertRead = (capabilities: Capabilities): boolean =>
  OBSERVABILITY_SOLUTION_NAV_LINK_IDS.some((appId) => hasNavLink(capabilities, appId)) ||
  hasFeatureUi(capabilities, LOGS_FEATURE_ID, FEATURE_UI_SHOW) ||
  hasFeatureUi(capabilities, STACK_ALERTS_FEATURE_ID, STACK_ALERTS_SHOW_UI_CAPABILITY) ||
  hasNavLink(capabilities, ML_APP_ID) ||
  hasFeatureUi(capabilities, DATA_QUALITY_FEATURE_ID, FEATURE_UI_SHOW) ||
  SECURITY_RULES_FEATURE_IDS.some((featureId) =>
    hasFeatureUi(capabilities, featureId, SECURITY_RULES_READ_UI_CAPABILITY)
  );

/** True when a Kibana privilege grants read access to at least one classic rule type. */
export const hasClassicRulesReadCapability = (capabilities: Capabilities): boolean =>
  hasSolutionRuleAndAlertRead(capabilities);

/**
 * True when a Kibana privilege grants read access to at least one classic alert.
 * Solution privileges that grant rule read are included because they also grant
 * alert read. `observabilityAlerts` and `stackAlertsOnly` are checked only here.
 */
export const hasClassicAlertsReadCapability = (capabilities: Capabilities): boolean =>
  hasSolutionRuleAndAlertRead(capabilities) ||
  hasFeatureUi(capabilities, OBSERVABILITY_ALERTS_FEATURE_ID, FEATURE_UI_SHOW) ||
  hasFeatureUi(capabilities, STACK_ALERTS_ONLY_FEATURE_ID, FEATURE_UI_SHOW);
