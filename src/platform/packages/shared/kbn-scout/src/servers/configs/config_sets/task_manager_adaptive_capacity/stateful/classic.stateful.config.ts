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

// `capacity` is read once at boot, so the heap-driven controller cannot be switched on at runtime.
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.task_manager.capacity=auto',
      // A short poll so the recurring task runs within the test budget.
      '--xpack.task_manager.poll_interval=1000',
    ],
  },
};
