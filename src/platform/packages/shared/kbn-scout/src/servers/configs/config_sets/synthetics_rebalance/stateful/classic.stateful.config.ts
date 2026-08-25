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
 * Scout server config for the Synthetics scalable-private-location rebalance
 * suite. `RebalancePrivateLocationShardsTask` is gated behind
 * `xpack.uptime.rebalancePrivateLocationShardsTaskEnabled` (defaults to
 * `false` as an operational kill-switch during rollout), read once at Kibana
 * boot -- there is no way to flip it on a running instance, so these specs
 * need it enabled from server start. The test spec must live under a
 * `test/scout_synthetics_rebalance/` directory so Scout's
 * `detectCustomConfigDir` resolves to this config set automatically.
 *
 * Usage:
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet synthetics_rebalance
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.uptime.rebalancePrivateLocationShardsTaskEnabled=true',
    ],
  },
};
