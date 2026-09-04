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
 * Scout server config for Synthetics suites that enroll a real Elastic Agent
 * in Docker.
 *
 * Bind ES HTTP on all interfaces. Docker Desktop maps `host.docker.internal`
 * to the host loopback (so localhost-only ES works locally), but Linux CI
 * maps it to the docker0 gateway (`172.17.0.1`), which refuses connections
 * unless ES listens there too.
 *
 * Fleet Server hosts and ES outputs for the Docker agent are registered at
 * runtime in the suite fixture so this config set does not leak Docker-specific
 * Fleet defaults into other suites sharing the server.
 *
 * Specs must live under `test/scout_synthetics_agent_e2e/` so `detectCustomConfigDir`
 * resolves to this set.
 *
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet synthetics_agent_e2e
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  esTestCluster: {
    ...defaultConfig.esTestCluster,
    serverArgs: [...defaultConfig.esTestCluster.serverArgs, 'http.host=0.0.0.0'],
  },
};
