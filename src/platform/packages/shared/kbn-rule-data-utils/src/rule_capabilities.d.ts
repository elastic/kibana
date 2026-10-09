import type { Capabilities } from '@kbn/core-capabilities-common';
/**
 * UI capability key under `capabilities.management.insightsAndAlerting` granting access to the
 * Stack Management Rules page served by `triggers_actions_ui` at `triggersActionsRoute`.
 */
export declare const TRIGGERS_ACTIONS_RULES_CAPABILITY_ID: 'triggersActionsRules';
export declare const canAccessTriggersActionsRules: (capabilities: Capabilities) => boolean;
