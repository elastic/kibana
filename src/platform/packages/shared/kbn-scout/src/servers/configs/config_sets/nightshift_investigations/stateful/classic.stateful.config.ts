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

// The plugin is disabled by default (xpack.nightshift_investigations.enabled),
// so its API tests run against a config set that turns it on. Investigations are stored as
// agentic investigations and propose actions through proposals, both disabled by default too, and
// they are only available behind the nightshift.enabled feature flag.
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.nightshift_investigations.enabled=true',
      '--xpack.agenticInvestigations.enabled=true',
      '--xpack.proposals.enabled=true',
      '--feature_flags.overrides.nightshift.enabled=true',
      // Investigation runs are long-running workflow tasks; leave room for the start workflows.
      '--xpack.task_manager.capacity=20',
    ],
  },
};
