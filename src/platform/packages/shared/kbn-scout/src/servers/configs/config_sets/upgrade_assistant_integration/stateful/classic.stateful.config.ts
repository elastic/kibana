/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync } from 'fs';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

const upgradeAssistantArchive = resolve(
  REPO_ROOT,
  'x-pack/platform/test/upgrade_assistant_integration/fixtures/data_archives/upgrade_assistant.zip'
);

const archiveConfig = existsSync(upgradeAssistantArchive)
  ? { dataArchive: upgradeAssistantArchive }
  : {};

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  esTestCluster: {
    ...defaultConfig.esTestCluster,
    ...archiveConfig,
  },
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      `--plugin-path=${resolve(REPO_ROOT, 'examples/routing_example')}`,
      `--plugin-path=${resolve(REPO_ROOT, 'examples/developer_examples')}`,
    ],
  },
};
