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
 * Isolated config set for `alert_actions_cleanup.spec.ts`. The `.alert-actions`
 * cleanup task is only scheduled when `retention.alertActions.dispatcher.enabled`
 * is set at startup, which cannot be toggled at runtime. Every other alerting_v2
 * suite runs on the default config; this one needs the extra server arg.
 *
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet alerting_v2_cleanup
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.alerting_v2.retention.alertActions.dispatcher.enabled=true',
    ],
  },
};
