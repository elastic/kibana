/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createVisualTestKey } from './test_key';

describe('createVisualTestKey', () => {
  it('creates a stable test key from the test file, title, and full target identity', () => {
    const testFile =
      'src/platform/plugins/private/advanced_settings/test/scout/ui/tests/advanced_settings_security.spec.ts';
    const testTitle = 'global advanced_settings all privileges - shows management navlink';

    const key = createVisualTestKey(testFile, testTitle, {
      projectName: 'local',
      location: 'local',
      arch: 'stateful',
      domain: 'classic',
    });

    expect(key).toMatch(/^advanced_settings_[a-z_]+-[0-9a-f]{8}-.*-local_stateful_classic_local$/);
    expect(key).toContain('global_advanced_settings');
    expect(key).toBe(
      createVisualTestKey(testFile, testTitle, {
        projectName: 'local',
        location: 'local',
        arch: 'stateful',
        domain: 'classic',
      })
    );
  });

  it('creates different test keys for different Scout targets', () => {
    const testFile =
      'src/platform/plugins/private/advanced_settings/test/scout/ui/tests/advanced_settings_security.spec.ts';
    const testTitle = 'global advanced_settings all privileges - shows management navlink';

    const classicKey = createVisualTestKey(testFile, testTitle, {
      projectName: 'local',
      location: 'local',
      arch: 'stateful',
      domain: 'classic',
    });
    const serverlessKey = createVisualTestKey(testFile, testTitle, {
      projectName: 'local',
      location: 'local',
      arch: 'serverless',
      domain: 'search',
    });

    expect(classicKey).not.toBe(serverlessKey);
  });
});
