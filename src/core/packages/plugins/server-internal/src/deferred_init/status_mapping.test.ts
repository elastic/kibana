/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ServiceStatusLevels } from '@kbn/core-status-common';
import type { PluginInitState, PluginInitStatus } from '@kbn/core-deferred-init-common';
import { toServiceStatus } from './status_mapping';

const status = (state: PluginInitState, attempts = 0, lastError?: Error): PluginInitStatus =>
  lastError ? { state, attempts, lastError } : { state, attempts };

describe('toServiceStatus', () => {
  it('reports `available` once initialize() has succeeded', () => {
    expect(toServiceStatus('myPlugin', status('available'))).toEqual({
      level: ServiceStatusLevels.available,
      summary: 'myPlugin is available',
    });
  });

  // `idle`/`initializing` are healthy, expected states for a plugin with `initialize()`: they
  // must NOT pin Kibana's overall status (the worst plugin status) below `available`, which would
  // break the FTR/Scout "wait until ready" check.
  it('reports `available` while idle, saying initialize() has not run yet', () => {
    expect(toServiceStatus('myPlugin', status('idle'))).toEqual({
      level: ServiceStatusLevels.available,
      summary: 'myPlugin is idle (initialize() has not run yet)',
    });
  });

  it('reports `available` while the first attempt is in progress', () => {
    expect(toServiceStatus('myPlugin', status('initializing'))).toEqual({
      level: ServiceStatusLevels.available,
      summary: 'myPlugin is initializing (initialize() in progress)',
    });
  });

  it('counts the failed attempts and carries the last error while a retry is in progress', () => {
    expect(toServiceStatus('myPlugin', status('initializing', 2, new Error('boom')))).toEqual({
      level: ServiceStatusLevels.available,
      summary: 'myPlugin is initializing (initialize() in progress), 2 failed attempt(s) so far',
      detail: 'boom',
    });
  });

  // `degraded`, not `unavailable`: the failure is local to this instance and scoped to this one
  // plugin (its own routes 503), so it should not pin the reported `overall` status to
  // `unavailable`.
  it('reports `degraded` with the attempt count and last error once the last attempt has failed', () => {
    expect(toServiceStatus('myPlugin', status('failed', 3, new Error('boom')))).toEqual({
      level: ServiceStatusLevels.degraded,
      summary: 'myPlugin initialize() failed (3 attempt(s))',
      detail: 'boom',
    });
  });

  it('omits `detail` when there is no last error', () => {
    expect(toServiceStatus('myPlugin', status('failed', 1))).toEqual({
      level: ServiceStatusLevels.degraded,
      summary: 'myPlugin initialize() failed (1 attempt(s))',
    });
  });
});
