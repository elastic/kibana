/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ServiceStatus, ServiceStatusLevels } from './types';
import { calculateLegacyStatus } from './legacy_status';

const available: ServiceStatus = { level: ServiceStatusLevels.available, summary: 'Available' };
const degraded: ServiceStatus = {
  level: ServiceStatusLevels.degraded,
  summary: 'This is degraded!',
};
const unavailable: ServiceStatus = {
  level: ServiceStatusLevels.unavailable,
  summary: 'This is unavailable!',
};
const critical: ServiceStatus = {
  level: ServiceStatusLevels.critical,
  summary: 'This is critical!',
};

describe('calculateLegacyStatus', () => {
  it('translates the overall status to the legacy format', () => {
    const legacyStatus = calculateLegacyStatus({
      overall: available,
      core: {} as any,
      plugins: {},
      versionWithoutSnapshot: '1.1.1',
    });

    expect(legacyStatus.overall).toEqual({
      state: 'green',
      title: 'Green',
      nickname: 'Looking good',
      icon: 'success',
      uiColor: 'success',
      since: expect.any(String),
    });
  });

  it('combines core and plugins statuses into statuses array in legacy format', () => {
    const legacyStatus = calculateLegacyStatus({
      overall: available,
      core: {
        elasticsearch: degraded,
        savedObjects: critical,
      },
      plugins: {
        a: available,
        b: unavailable,
        c: degraded,
      },
      versionWithoutSnapshot: '1.1.1',
    });

    expect(legacyStatus.statuses).toEqual([
      {
        icon: 'warning',
        id: 'core:elasticsearch@1.1.1',
        message: 'This is degraded!',
        since: expect.any(String),
        state: 'yellow',
        uiColor: 'warning',
      },
      {
        icon: 'danger',
        id: 'core:savedObjects@1.1.1',
        message: 'This is critical!',
        since: expect.any(String),
        state: 'red',
        uiColor: 'danger',
      },
      {
        icon: 'success',
        id: 'plugin:a@1.1.1',
        message: 'Available',
        since: expect.any(String),
        state: 'green',
        uiColor: 'success',
      },
      {
        icon: 'danger',
        id: 'plugin:b@1.1.1',
        message: 'This is unavailable!',
        since: expect.any(String),
        state: 'red',
        uiColor: 'danger',
      },
      {
        icon: 'warning',
        id: 'plugin:c@1.1.1',
        message: 'This is degraded!',
        since: expect.any(String),
        state: 'yellow',
        uiColor: 'warning',
      },
    ]);
  });
});
