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

// The plugin is disabled by default (xpack.nightshift_investigations.enabled),
// so its tests run against a config set that turns it on. The workflows_extensions trigger
// approval test runs on it too, it needs the plugin on so its triggers are in the catalog.
// Investigations are stored as agentic investigations and propose actions through proposals, both
// disabled by default too, and they are only available behind the nightshift.enabled feature flag.
// Semantic Memory is a separate flag that also defaults to false, and the Memory browsing
// page is silently absent without it, so it is turned on here rather than in each suite.

/**
 * Investigations run on Nightshift's code-owned default model, an EIS inference endpoint this stack
 * does not have. A preconfigured connector under that id points at the LLM endpoint the
 * investigation write path API tests start on this port; it never answers, so their runs stay in
 * progress. Keep both in sync with `NIGHTSHIFT_SCOUT_LLM_PORT` in those tests' fixtures.
 */
const NIGHTSHIFT_INVESTIGATION_DEFAULT_MODEL_ID = '.anthropic-claude-4.6-sonnet-chat_completion';
const NIGHTSHIFT_SCOUT_LLM_PORT = 8095;

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.nightshift_investigations.enabled=true',
      '--xpack.nightshift_investigations.memory.enabled=true',
      '--xpack.agenticInvestigations.enabled=true',
      '--xpack.proposals.enabled=true',
      '--feature_flags.overrides.nightshift.enabled=true',
      `--xpack.actions.preconfigured=${JSON.stringify({
        [NIGHTSHIFT_INVESTIGATION_DEFAULT_MODEL_ID]: {
          name: 'Nightshift Scout unresponsive LLM',
          actionTypeId: '.gen-ai',
          config: {
            apiProvider: 'OpenAI',
            apiUrl: `http://127.0.0.1:${NIGHTSHIFT_SCOUT_LLM_PORT}/v1/chat/completions`,
            defaultModel: 'gpt-4o',
          },
          secrets: { apiKey: 'scout' },
        },
      })}`,
      // Investigation runs are long-running workflow tasks; leave room for the start workflows.
      '--xpack.task_manager.capacity=20',
    ],
  },
};
