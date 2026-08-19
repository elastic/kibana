/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as evalsEndpointConfig } from '../../evals_endpoint/stateful/classic.stateful.config';

/**
 * Endpoint evals stack WITH the Osquery integration installed.
 *
 * Split from `evals_endpoint` so the Osquery install is scoped to the live-state
 * suite that needs it. Installing osquery_manager for every endpoint eval makes
 * the "Osquery not installed" branch unreachable, and also changes the tool
 * surface for unrelated suites (Automatic Troubleshooting, forensic smoke),
 * which is an uncontrolled variable in their results.
 */
export const servers: ScoutServerConfig = {
  ...evalsEndpointConfig,
  kbnTestServer: {
    ...evalsEndpointConfig.kbnTestServer,
    serverArgs: [
      ...evalsEndpointConfig.kbnTestServer.serverArgs,
      '--xpack.fleet.packages.1.name=osquery_manager',
      '--xpack.fleet.packages.1.version=latest',
    ],
  },
};
