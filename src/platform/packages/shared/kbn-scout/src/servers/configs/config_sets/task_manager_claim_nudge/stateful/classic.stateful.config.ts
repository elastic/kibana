/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers as defaultConfig } from '../../default/stateful/classic.stateful.config';
import type { ScoutServerConfig } from '../../../../../types';

// A long poll interval so a claim within seconds of `runSoon` can only come from the nudge.
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.task_manager.poll_interval=30000',
      // With at most 10 samples, p99 is the maximum poll duration, bounding the cycle start.
      '--xpack.task_manager.monitored_stats_running_average_window=10',
      // Pinned in case the default changes.
      '--xpack.task_manager.claim_nudge.enabled=true',
      // Excludes every other task type so the backlog can't crowd out the nudged claim.
      '--xpack.task_manager.unsafe.exclude_task_types=["!task_manager:invalidate_api_keys"]',
    ],
  },
};
