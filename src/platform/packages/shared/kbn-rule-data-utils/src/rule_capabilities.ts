/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Capabilities } from '@kbn/core-capabilities-common';
import { STACK_ALERTS_FEATURE_ID, STACK_ALERTS_UI_SHOW } from './rule_types/stack_rules';

/**
 * UI capability key under `capabilities.management.insightsAndAlerting` granting access to the
 * Stack Management Rules page served by `triggers_actions_ui` at `triggersActionsRoute`.
 */
export const TRIGGERS_ACTIONS_RULES_CAPABILITY_ID = 'triggersActionsRules' as const;

export const canAccessTriggersActionsRules = (capabilities: Capabilities): boolean =>
  Boolean(capabilities.management?.insightsAndAlerting?.[TRIGGERS_ACTIONS_RULES_CAPABILITY_ID]);

const OBSERVABILITY_RULES_NAV_LINKS = ['apm', 'metrics', 'uptime', 'synthetics', 'slo'] as const;

/**
 * Security rules feature ids that are still registered. Each grants `read_rules` with classic
 * rule read. Older ids stay so unmigrated roles keep the Observability Rules link.
 */
const SECURITY_RULES_FEATURE_IDS = [
  'securitySolutionRulesV1',
  'securitySolutionRulesV2',
  'securitySolutionRulesV3',
  'securitySolutionRulesV4',
] as const;

/**
 * Feature UI capabilities that imply classic rule read.
 * `canUseMlAlerts` excludes the Machine Learning APM sub-privilege, which grants `canGetJobs`
 * and has no rule read.
 */
const CLASSIC_RULES_FEATURE_CAPABILITIES: ReadonlyArray<readonly [string, string]> = [
  ['logs', 'show'],
  [STACK_ALERTS_FEATURE_ID, STACK_ALERTS_UI_SHOW],
  ['ml', 'canUseMlAlerts'],
  ['dataQuality', 'show'],
  ...SECURITY_RULES_FEATURE_IDS.map((featureId) => [featureId, 'read_rules'] as const),
];

/** True when a Kibana privilege grants read access to at least one classic rule type. */
export const hasClassicRulesReadCapability = (capabilities: Capabilities): boolean =>
  OBSERVABILITY_RULES_NAV_LINKS.some((appId) => capabilities.navLinks?.[appId] === true) ||
  CLASSIC_RULES_FEATURE_CAPABILITIES.some(
    ([featureId, uiCapability]) => capabilities[featureId]?.[uiCapability] === true
  );
