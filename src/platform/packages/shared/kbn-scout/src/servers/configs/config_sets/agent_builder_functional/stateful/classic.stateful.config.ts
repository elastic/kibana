/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

/**
 * Stateful defaults with Agent Builder UI test settings: Agent Builder debug logging,
 * AI agents feature flag, and AI Assistant chat experience set to agent mode.
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      `--logging.loggers=${JSON.stringify([
        { name: 'plugins.agentBuilder', level: 'debug', appenders: ['console'] },
      ])}`,
      '--feature_flags.overrides.aiAssistant.aiAgents.enabled=true',
      '--uiSettings.overrides.aiAssistant:preferredChatExperience=agent',
    ],
  },
};
