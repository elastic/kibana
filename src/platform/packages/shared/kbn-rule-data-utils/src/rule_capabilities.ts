/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Capabilities } from '@kbn/core-capabilities-common';
import { ML_APP_ID } from '@kbn/deeplinks-ml';
import {
  STACK_ALERTS_FEATURE_ID,
  STACK_ALERTS_ONLY_FEATURE_ID,
  STACK_ALERTS_SHOW_UI_CAPABILITY,
} from './rule_types/stack_rules';

/** UI capability for the Stack Management Rules page. */
export const TRIGGERS_ACTIONS_RULES_CAPABILITY_ID = 'triggersActionsRules' as const;

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

/** Platform features whose privileges grant classic alert read, including alert-only Stack Alerts. */
export const hasPlatformAlertReadCapabilities = (capabilities: Capabilities): boolean =>
  hasPlatformRuleReadCapabilities(capabilities) ||
  capabilities[STACK_ALERTS_ONLY_FEATURE_ID]?.show === true;
