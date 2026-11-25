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

// Matches ML_APP_ID in src/platform/packages/shared/deeplinks/ml/deep_links.ts.
const ML_APP_ID = 'ml';

// Matches PLUGIN_FEATURE_ID in x-pack/platform/plugins/shared/data_quality/common/index.ts.
const DATA_QUALITY_FEATURE_ID = 'dataQuality';

/** True for the Stack Management Rules capability, including Actions and Connectors and Classic Rules Settings. */
export const canAccessTriggersActionsRules = (capabilities: Capabilities): boolean =>
  Boolean(capabilities.management?.insightsAndAlerting?.[TRIGGERS_ACTIONS_RULES_CAPABILITY_ID]);

/** Platform features whose privileges grant classic rule read. Each one also grants `triggersActionsRules`. */
export const hasPlatformRuleReadCapabilities = (capabilities: Capabilities): boolean =>
  capabilities[STACK_ALERTS_FEATURE_ID]?.[STACK_ALERTS_SHOW_UI_CAPABILITY] === true ||
  capabilities.navLinks?.[ML_APP_ID] === true ||
  capabilities[DATA_QUALITY_FEATURE_ID]?.show === true;

// ML Read sets this UI capability. It grants anomaly-detection alert read and not `rac`.
const ML_ANOMALY_ALERT_READ_CAPABILITY = 'canUseMlAlerts';

/**
 * UI capabilities whose privileges include the `rac` API.
 * Literals match the Security Solution feature ids so this platform package does not depend on it.
 * Observability features that grant `rac` are checked in `@kbn/observability-shared-plugin`.
 */
const RAC_UI_CAPABILITIES = [
  ['siem', 'show'],
  ['siemV2', 'show'],
  ['siemV3', 'show'],
  ['siemV4', 'show'],
  ['siemV5', 'show'],
  ['securitySolutionRulesV1', 'read_rules'],
  ['securitySolutionRulesV2', 'read_rules'],
  ['securitySolutionRulesV3', 'read_rules'],
  ['securitySolutionRulesV4', 'read_rules'],
  ['securitySolutionAlertsV1', 'read_alerts'],
] as const;

const hasMlAnomalyAlertRead = (capabilities: Capabilities): boolean =>
  capabilities.ml?.[ML_ANOMALY_ALERT_READ_CAPABILITY] === true;

const hasRacFromAnotherFeature = (capabilities: Capabilities): boolean =>
  RAC_UI_CAPABILITIES.some(
    ([featureId, capabilityId]) => capabilities[featureId]?.[capabilityId] === true
  );

/**
 * True when the user can read classic alerts and call `rac`.
 * Stack Alerts grants both. Machine Learning grants alert read only, so it counts when another
 * feature in the same space grants `rac`, such as Security Rules and Exceptions Read.
 */
export const hasPlatformAlertReadCapabilities = (capabilities: Capabilities): boolean =>
  capabilities[STACK_ALERTS_FEATURE_ID]?.[STACK_ALERTS_SHOW_UI_CAPABILITY] === true ||
  capabilities[STACK_ALERTS_ONLY_FEATURE_ID]?.show === true ||
  (hasMlAnomalyAlertRead(capabilities) && hasRacFromAnotherFeature(capabilities));
