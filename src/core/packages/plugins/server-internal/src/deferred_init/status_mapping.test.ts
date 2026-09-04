/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ServiceStatusLevels } from '@kbn/core-status-common';
import type { InitState } from '@kbn/core-plugins-server';
import { toServiceStatus } from './status_mapping';

describe('toServiceStatus', () => {
  it('reports `available` when the deferred init has completed', () => {
    expect(toServiceStatus('myPlugin', 'available')).toEqual({
      level: ServiceStatusLevels.available,
      summary: 'myPlugin is available',
    });
  });

  // `idle`/`initializing` are healthy, expected states for a lazy plugin: they must NOT pin
  // Kibana's overall status (the worst plugin status) to `unavailable`, which would break
  // health-check gating and the FTR/Scout "wait until ready" check.
  it.each<InitState>(['idle', 'initializing'])(
    'reports `available` (with a descriptive summary) while %s',
    (state) => {
      const status = toServiceStatus('myPlugin', state);
      expect(status.level).toBe(ServiceStatusLevels.available);
      expect(status.summary).toContain('myPlugin');
    }
  );

  it('reports `unavailable` only when the deferred init has failed', () => {
    expect(toServiceStatus('myPlugin', 'failed')).toEqual({
      level: ServiceStatusLevels.unavailable,
      summary: 'myPlugin deferred initialization failed',
    });
  });
});
