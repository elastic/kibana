/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MOCK_IDP_UIAM_OAUTH_BASE_URL } from '@kbn/mock-idp-utils';
import { servers as defaultConfig } from '../../default/serverless/search.serverless.config';
import type { ScoutServerConfig } from '../../../../../types';

/**
 * Fixed port for the in-repo GitHub-style plugin mock used by Agent Builder plugin install tests.
 * Kept in sync with `SCOUT_AGENT_BUILDER_GITHUB_MOCK_PORT` in Agent Builder Scout shared fixtures.
 */
const AGENT_BUILDER_GITHUB_MOCK_PORT = 18387;

/**
 * Serverless Elasticsearch project defaults with Agent Builder test settings:
 * experimental Agent Builder UI flags, the Context Engine flag, `githubBaseUrl`
 * for plugin installation tests, AI agents feature flag, and AI Assistant chat
 * experience set to agent mode.
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  esServerlessOptions: {
    ...defaultConfig.esServerlessOptions!,
    uiamOAuth: true,
  },
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      `--logging.loggers=${JSON.stringify([
        { name: 'plugins.agentBuilder', level: 'debug', appenders: ['console'] },
      ])}`,
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
      '--uiSettings.overrides.contextEngine:enabled=true',
      '--uiSettings.overrides.agentBuilder:tracing:enabled=true',
      '--uiSettings.overrides.agentBuilder:tracing:includeUserPrompts=true',
      '--uiSettings.overrides.agentBuilder:tracing:includeSystemPrompt=true',
      '--uiSettings.overrides.agentBuilder:tracing:includeLlmResponses=true',
      '--uiSettings.overrides.agentBuilder:tracing:includeToolDetails=true',
      '--uiSettings.overrides.agentBuilder:tracing:includeRealNames=true',
      '--uiSettings.overrides.agentBuilder:tracing:includeRealIds=true',
      '--feature_flags.overrides.aiAssistant.aiAgents.enabled=true',
      '--uiSettings.overrides.aiAssistant:preferredChatExperience=agent',
      '--xpack.agentBuilder.tracing.scheduledDelay=500',
      `--xpack.agentBuilder.githubBaseUrl=http://localhost:${AGENT_BUILDER_GITHUB_MOCK_PORT}`,
      `--xpack.security.mcp.oauth2.metadata.authorization_servers=${JSON.stringify([
        MOCK_IDP_UIAM_OAUTH_BASE_URL,
      ])}`,
      `--xpack.security.mcp.oauth2.metadata.resource=http://localhost:5620/api/agent_builder/mcp`,
    ],
  },
};
