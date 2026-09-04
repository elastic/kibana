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
 * Map a plugin's deferred-init {@link InitState} onto a core {@link ServiceStatus} for the
 * plugin's `/status` entry.
 *
 * Deferring work is a healthy, expected state, so `idle` and `initializing` report `available`:
 * a lazy plugin that simply hasn't run its deferred work yet must NOT drag Kibana's overall
 * status (the worst of all plugin statuses) to `unavailable`, which would break load-balancer /
 * health-check gating and the FTR/Scout "wait until ready" check. Only a genuine `failed`
 * deferred initialization reports `unavailable`; the descriptive summary still conveys the
 * precise lifecycle state, and the browser reads the detailed state from the deferred-init status
 * route rather than this level.
 *
 * @internal
 */
export const toServiceStatus = (pluginId: string, state: InitState): ServiceStatus => {
  switch (state) {
    case 'available':
      return { level: ServiceStatusLevels.available, summary: `${pluginId} is available` };
    case 'initializing':
      return {
        level: ServiceStatusLevels.available,
        summary: `${pluginId} is initializing (deferred initialization in progress)`,
      };
    case 'failed':
      return {
        level: ServiceStatusLevels.unavailable,
        summary: `${pluginId} deferred initialization failed`,
      };
    case 'idle':
    default:
      return {
        level: ServiceStatusLevels.available,
        summary: `${pluginId} is idle (deferred initialization not started)`,
      };
  }
};
