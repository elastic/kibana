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

/**
 * Loads the sample task fixture so Task Manager tests can schedule a task that
 * actually runs and yields. Local stateful only; this set is not used for MKI.
 */
const SAMPLE_TASK_PLUGIN_PATH = `--plugin-path=${resolve(
  REPO_ROOT,
  'x-pack/platform/test/plugin_api_integration/plugins/sample_task_plugin'
)}`;

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [...defaultConfig.kbnTestServer.serverArgs, SAMPLE_TASK_PLUGIN_PATH],
  },
};
