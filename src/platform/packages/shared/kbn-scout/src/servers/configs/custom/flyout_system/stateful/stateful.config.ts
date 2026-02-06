/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../../default/stateful/base.config';

/**
 * Custom Scout stateful server configuration for the Flyout System example plugin.
 *
 * Since `flyoutSystemExamples` is an example plugin, the Kibana dev server must
 * be started with `--run-examples` to load example plugins from the `examples/` directory.
 *
 * Usage:
 *   node scripts/scout.js start-server --stateful --config-dir flyout_system
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    sourceArgs: [...defaultConfig.kbnTestServer.sourceArgs, '--run-examples'],
  },
};
