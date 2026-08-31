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

export const servers: ScoutServerConfig = {
  ...evalsAgentBuilderConfig,
  kbnTestServer: {
    ...evalsAgentBuilderConfig.kbnTestServer,
    serverArgs: [
      ...evalsAgentBuilderConfig.kbnTestServer.serverArgs,
      '--uiSettings.overrides.alerting:v2:enabled=true',
      /* Disable tracing redaction so exported spans carry real prompt/response
       * content when inspecting eval runs in Phoenix or Kibana's Tracing UI. */
      '--uiSettings.overrides.agentBuilder:tracing:includeUserPrompts=true',
      '--uiSettings.overrides.agentBuilder:tracing:includeSystemPrompt=true',
      '--uiSettings.overrides.agentBuilder:tracing:includeLlmResponses=true',
      '--uiSettings.overrides.agentBuilder:tracing:includeToolDetails=true',
      '--uiSettings.overrides.agentBuilder:tracing:includeRealNames=true',
      '--uiSettings.overrides.agentBuilder:tracing:includeRealIds=true',
    ],
  },
};
