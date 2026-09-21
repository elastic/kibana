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

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    // initialSolutionSetup is dev-only. Scout CI runs the production distributable, so this lane must
    // explicitly use the development environment before enabling initial solution setup.
    buildArgs: [...defaultConfig.kbnTestServer.buildArgs, '--env.name=development'],
    serverArgs: [
      // Default Scout disables this flow to keep existing Spaces tests unchanged. This dedicated lane
      // replaces that default so a fresh default space is created with setup pending.
      ...defaultConfig.kbnTestServer.serverArgs.filter(
        (arg) => arg !== '--xpack.spaces.initialSolutionSetup.enabled=false'
      ),
      '--xpack.spaces.initialSolutionSetup.enabled=true',
    ],
  },
};
