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
// Semantic Memory is a separate flag that also defaults to false, and the Memory browsing
// page is silently absent without it, so it is turned on here rather than in each suite.
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.nightshift_investigations.enabled=true',
      '--xpack.nightshift_investigations.memory.enabled=true',
    ],
  },
};
