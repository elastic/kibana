/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

const pluginPath = `--plugin-path=${resolve(
  REPO_ROOT,
  'x-pack/platform/test/search_inference_endpoints/plugins/search_inference_endpoints_fixture'
)}`;

/**
 * Two fake preconfigured OpenAI connectors used by Scout API tests that need a
 * non-empty connector catalog (e.g. per-space connector isolation tests).
 * The API keys are intentionally bogus — the connectors are only queried for
 * their IDs, never actually invoked.
 */
const preconfiguredConnectors = `--xpack.actions.preconfigured=${JSON.stringify({
  'inference-test-connector-1': {
    name: 'Inference Test Connector 1',
    actionTypeId: '.gen-ai',
    config: {
      apiProvider: 'OpenAI',
      apiUrl: 'https://api.openai.com/v1/chat/completions',
    },
    secrets: { apiKey: 'test-key-1' },
  },
  'inference-test-connector-2': {
    name: 'Inference Test Connector 2',
    actionTypeId: '.gen-ai',
    config: {
      apiProvider: 'OpenAI',
      apiUrl: 'https://api.openai.com/v1/chat/completions',
    },
    secrets: { apiKey: 'test-key-2' },
  },
})}`;

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [...defaultConfig.kbnTestServer.serverArgs, pluginPath, preconfiguredConnectors],
  },
};
