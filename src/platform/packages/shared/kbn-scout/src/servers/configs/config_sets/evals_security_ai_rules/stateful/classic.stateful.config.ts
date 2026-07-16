/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as evalsTracingConfig } from '../../evals_tracing/stateful/classic.stateful.config';

/**
 * Scout stateful config for security-ai-rules evals (Track A + Track B routing)
 * and the security specs in the Agent Builder suite (find-rules,
 * recommend-prebuilt-rules). Registers the security Agent Builder skills that
 * are dark by default and enables the experimental UI features the routing
 * specs rely on.
 *
 * Skill flags enabled here:
 *   - dexAiSkillFindRules            -> find-security-rules skill
 *   - dexAiSkillRecommendPrebuiltRules -> recommend-prebuilt-rules skill
 *     (register_skills.ts gates it on this flag; without it the skill is never
 *     registered and recommend_prebuilt_rules.spec.ts sees zero
 *     security.find_prebuilt_rules calls, failing on every model).
 *
 * Usage:
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet evals_security_ai_rules
 */
export const servers: ScoutServerConfig = {
  ...evalsTracingConfig,
  kbnTestServer: {
    ...evalsTracingConfig.kbnTestServer,
    serverArgs: [
      ...evalsTracingConfig.kbnTestServer.serverArgs,
      '--feature_flags.overrides.aiAssistant.aiAgents.enabled=true',
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
      `--xpack.securitySolution.enableExperimental=${JSON.stringify([
        'aiRuleCreationEnabled',
        'dexAiSkillFindRules',
        'dexAiSkillRecommendPrebuiltRules',
        'entityAnalyticsEntityStoreV2',
      ])}`,
      `--uiSettings.overrides.securitySolution:entityStoreEnableV2=true`,
    ],
  },
};
