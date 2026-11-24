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
 * SLO global settings with SLI retention set in kibana.yml, read at startup only.
 * Used by `x-pack/solutions/observability/plugins/slo/test/scout_slo_global_settings_override`.
 *
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet slo_global_settings_override
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.slo.sliRetention.enabled=true',
      '--xpack.slo.sliRetention.periodDays=200',
    ],
  },
};
