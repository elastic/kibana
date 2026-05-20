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
 * Scout server config for Lighthouse performance benchmarks.
 *
 * Extends the default stateful config with `--no-optimizer` so Kibana serves
 * pre-built dist bundles instead of running the dev compiler. The test spec
 * must live under a `test/scout_lighthouse/` directory so that Scout's
 * `detectCustomConfigDir` resolves to this config set automatically.
 *
 * Usage:
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet lighthouse
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    sourceArgs: [...defaultConfig.kbnTestServer.sourceArgs, '--no-optimizer'],
  },
};
