/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

const BASE_PATH = '/workflow-repro';

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  servers: {
    ...defaultConfig.servers,
    kibana: {
      ...defaultConfig.servers.kibana,
      pathname: BASE_PATH,
    },
  },
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    env: {
      ...defaultConfig.kbnTestServer.env,
      KBN_PATH_CONF: resolve(__dirname, './config'),
    },
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs.filter(
        (arg) => !arg.startsWith('--server.publicBaseUrl=')
      ),
      '--uiSettings.overrides.workflows:ui:enabled=true',
    ],
  },
};
