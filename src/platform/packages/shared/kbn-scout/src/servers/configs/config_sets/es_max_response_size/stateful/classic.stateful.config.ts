/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as defaultConfig } from '../../default/stateful/classic.stateful.config';
import { esMaxResponseSizeServerArgs } from '../shared';

/**
 * Scout server config for tests exercising Kibana behaviour when Elasticsearch responses exceed
 * `elasticsearch.maxResponseSize`. The limit cannot be changed at runtime, so it needs its own config set.
 *
 * Usage:
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet es_max_response_size
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [...defaultConfig.kbnTestServer.serverArgs, ...esMaxResponseSizeServerArgs],
  },
};
