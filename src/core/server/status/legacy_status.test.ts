/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
      uiColor: 'secondary',
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
        uiColor: 'secondary',
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
