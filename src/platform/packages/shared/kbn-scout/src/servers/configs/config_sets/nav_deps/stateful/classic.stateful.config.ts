/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as defaultServers } from '../../default/stateful/classic.stateful.config';

// Enables the inert `window.__kbnNavDependencies__()` bridge used by the
// cross-plugin navigation dependency enforcement test.
export const servers: ScoutServerConfig = {
  ...defaultServers,
  kbnTestServer: {
    ...defaultServers.kbnTestServer,
    serverArgs: [
      ...defaultServers.kbnTestServer.serverArgs,
      '--plugins.exposeNavDependencies=true',
    ],
  },
};
