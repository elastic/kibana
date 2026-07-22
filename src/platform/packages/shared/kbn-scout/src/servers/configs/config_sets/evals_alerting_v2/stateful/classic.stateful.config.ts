/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as evalsAgentBuilderConfig } from '../../evals_agent_builder/stateful/classic.stateful.config';

/**
 * Custom Scout stateful server configuration for the Alerting V2 rule-management
 * evals suite.
 *
 * Extends `evals_agent_builder` (Agent Builder experimental features + the
 * `xpack.alerting_v2.enabled` plugin flag) and additionally turns on the
 * `alerting:v2:enabled` advanced setting. The plugin flag alone only registers
 * the alerting_v2 routes/APIs — the `rule-management` skill itself is gated by
 * `uiSettingRequired: ALERTING_V2_ENABLED_SETTING_ID` (see
 * `rule_management_skill.ts`), which reads this advanced setting and defaults
 * to `false`. Without this override the skill is never visible to the agent,
 * even though the plugin is enabled.
 *
 * Also overrides the `agentBuilder:tracing:includeXxx` privacy settings to `true`
 * (they default to `false`, redacting prompts/responses/tool args in exported
 * spans). `evals_tracing` already exports OTel spans to both the local EDOT
 * collector and a local Phoenix instance (project `kibana-evals`); this override
 * ensures those spans carry the actual content instead of `[REDACTED]` when
 * inspecting a run manually in Phoenix or Kibana's Tracing UI.
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet evals_alerting_v2
 */
export const servers: ScoutServerConfig = {
  ...evalsAgentBuilderConfig,
  kbnTestServer: {
    ...evalsAgentBuilderConfig.kbnTestServer,
    serverArgs: [
      ...evalsAgentBuilderConfig.kbnTestServer.serverArgs,
      '--uiSettings.overrides.alerting:v2:enabled=true',
      '--uiSettings.overrides.agentBuilder:tracing:includeUserPrompts=true',
      '--uiSettings.overrides.agentBuilder:tracing:includeSystemPrompt=true',
      '--uiSettings.overrides.agentBuilder:tracing:includeLlmResponses=true',
      '--uiSettings.overrides.agentBuilder:tracing:includeToolDetails=true',
      '--uiSettings.overrides.agentBuilder:tracing:includeRealNames=true',
      '--uiSettings.overrides.agentBuilder:tracing:includeRealIds=true',
    ],
  },
};
