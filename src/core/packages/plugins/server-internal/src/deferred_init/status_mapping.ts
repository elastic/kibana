/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ServiceStatusLevels, type ServiceStatus } from '@kbn/core-status-common';
import type { PluginInitStatus } from '@kbn/core-deferred-init-common';

const levelAndSummary = (
  pluginId: string,
  { state, attempts }: PluginInitStatus
): Pick<ServiceStatus, 'level' | 'summary'> => {
  switch (state) {
    case 'available':
      return { level: ServiceStatusLevels.available, summary: `${pluginId} is available` };
    case 'initializing':
      return {
        level: ServiceStatusLevels.available,
        summary:
          `${pluginId} is initializing (initialize() in progress)` +
          (attempts > 0 ? `, ${attempts} failed attempt(s) so far` : ''),
      };
    case 'failed':
      return {
        level: ServiceStatusLevels.degraded,
        summary: `${pluginId} initialize() failed (${attempts} attempt(s))`,
      };
    case 'idle':
    default:
      return {
        level: ServiceStatusLevels.available,
        summary: `${pluginId} is idle (initialize() has not run yet)`,
      };
  }
};

/**
 * Maps a plugin's {@link PluginInitStatus} onto the core {@link ServiceStatus} shown as the
 * plugin's `/status` entry.
 *
 * Not having run `initialize()` yet is a healthy, expected state, so `idle` and `initializing`
 * report `available`: a plugin whose `initialize()` simply has not run yet must NOT drag Kibana's
 * overall status (the worst of all plugin statuses) down, which would break the FTR/Scout "wait
 * until ready" check.
 *
 * A `failed` attempt reports `degraded` ("some features may not be working") rather than
 * `unavailable`. `initialize()` runs once per Kibana instance, so a failure is local to this
 * instance and scoped to this one plugin: its own routes 503, and nothing else on the instance is
 * affected. `degraded` says exactly that, and keeps one plugin's failure from pinning the reported
 * `overall` status to `unavailable`. The summary still conveys the precise lifecycle state and
 * the failed attempt count, and `detail` carries the last error's message; the browser reads the
 * same information from the plugin initialization status route rather than from this level.
 *
 * @internal
 */
export const toServiceStatus = (pluginId: string, status: PluginInitStatus): ServiceStatus => {
  const base = levelAndSummary(pluginId, status);
  const { lastError } = status;
  return lastError ? { ...base, detail: lastError.message } : base;
};
