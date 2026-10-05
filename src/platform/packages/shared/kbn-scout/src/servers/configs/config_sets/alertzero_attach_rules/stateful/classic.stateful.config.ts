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
 * Scout server config for `security_solution/test/scout_alertzero_attach_rules`.
 *
 * The Alert Triage Worker and its attach workflow only exist when `xpack.alertzero.enabled` is
 * set. `agenticInvestigations` and `proposals` are required by alertzero and default off; without
 * them Kibana cascade-disables alertzero and the managed workflows are never installed.
 *
 * Usage:
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet alertzero_attach_rules
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.alertzero.enabled=true',
      '--xpack.agenticInvestigations.enabled=true',
      '--xpack.proposals.enabled=true',
    ],
  },
};
