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
 * Extends the default Scout config with preconfigured connectors required by
 * triggers_actions_ui tests that verify preconfigured-connector UI behaviour
 * (read-only flyout, preconfigured badge, disabled delete checkbox).
 *
 * These connectors must be declared in kibana.yml / server args — they cannot
 * be created via the REST API, so they live here rather than in global.setup.ts.
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      `--xpack.actions.preconfigured=${JSON.stringify({
        'my-server-log': { actionTypeId: '.server-log', name: 'Serverlog' },
        'my-email-connector': {
          actionTypeId: '.email',
          name: 'Email#test-preconfigured-email',
          config: { from: 'me@example.com', host: 'localhost', port: '1025' },
        },
      })}`,
    ],
  },
};
