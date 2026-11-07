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
import { inboundHubServerArgs } from '../shared';

/**
 * Stateful stack for the inbound events hub. The test plugin publishes events-on
 * in-memory webhook connectors so a Kibana API key can schedule a workflow.
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  esTestCluster: {
    ...defaultConfig.esTestCluster,
    // The ML native controller fails to boot when its temp pipe is missing, which
    // stops the cluster before Kibana starts.
    serverArgs: [...defaultConfig.esTestCluster.serverArgs, 'xpack.ml.enabled=false'],
  },
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [...defaultConfig.kbnTestServer.serverArgs, ...inboundHubServerArgs],
  },
};
