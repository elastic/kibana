/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ServiceStatusLevels, type ServiceStatus } from '@kbn/core-status-common';
import type { InitState } from '@kbn/core-plugins-server';

/**
 * Map a plugin's deferred-init {@link InitState} onto a core {@link ServiceStatus} so the
 * plugin's `/status` entry reflects the lifecycle: only `available` reports as available;
 * everything else reports `unavailable` with a descriptive summary.
 *
 * @internal
 */
export const toServiceStatus = (pluginId: string, state: InitState): ServiceStatus => {
  switch (state) {
    case 'available':
      return { level: ServiceStatusLevels.available, summary: `${pluginId} is available` };
    case 'initializing':
      return { level: ServiceStatusLevels.unavailable, summary: `${pluginId} is initializing` };
    case 'failed':
      return {
        level: ServiceStatusLevels.unavailable,
        summary: `${pluginId} deferred initialization failed`,
      };
    case 'idle':
    default:
      return {
        level: ServiceStatusLevels.unavailable,
        summary: `${pluginId} is idle (deferred initialization not started)`,
      };
  }
};
