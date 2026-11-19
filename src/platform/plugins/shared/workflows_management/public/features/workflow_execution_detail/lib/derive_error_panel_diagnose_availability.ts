/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Matches Agent Builder `minimumLicense` / `hasAtLeast('enterprise')`.
 * Confirm with the AB team before treating this as final product copy.
 */
export const AGENT_BUILDER_REQUIRED_LICENSE_TIER = 'enterprise';

/** Failed-step error panel AI diagnose availability (A–D). */
export type ErrorPanelDiagnoseState = 'a' | 'b' | 'c' | 'd';

export interface EmbeddableChatAccessSnapshot {
  hasRequiredLicense: boolean;
  hasLlmConnector: boolean;
}

export interface DeriveErrorPanelDiagnoseAvailabilityInput {
  /** Agent Builder start contract resolved (plugin present in the deployment). */
  pluginPresent: boolean;
  /** `capabilities.agentBuilder.show`. */
  hasShowPrivilege: boolean;
  /**
   * Result of `getAgentBuilderAccess()`. Null while loading or when the call
   * failed — both degrade to D (never advertise what we cannot verify).
   */
  access: EmbeddableChatAccessSnapshot | null;
}

/**
 * Map Agent Builder presence / license / LLM connector into the four panel states.
 * Unknown or failed detection → D.
 */
export const deriveErrorPanelDiagnoseAvailability = (
  input: DeriveErrorPanelDiagnoseAvailabilityInput
): ErrorPanelDiagnoseState => {
  if (!input.pluginPresent || !input.hasShowPrivilege || input.access == null) {
    return 'd';
  }
  if (!input.access.hasRequiredLicense) {
    return 'c';
  }
  if (!input.access.hasLlmConnector) {
    return 'b';
  }
  return 'a';
};

/**
 * When the diagnose feature flag is off, A/B render as D (no Diagnose CTA).
 * C/D always ship.
 */
export const effectiveErrorPanelDiagnoseState = (
  state: ErrorPanelDiagnoseState,
  diagnoseFeatureEnabled: boolean
): ErrorPanelDiagnoseState => {
  if (!diagnoseFeatureEnabled && (state === 'a' || state === 'b')) {
    return 'd';
  }
  return state;
};
