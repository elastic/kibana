/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createPlaywrightConfig, expect, tags } from '../../../../src/playwright';
import { test } from '../fixtures';

test.describe('Browser proxy environment', { tag: [...tags.stateful.classic] }, () => {
  test.skip(
    process.platform !== 'linux',
    'Chromium reads proxy environment variables only on Linux'
  );

  test('uses the proxy when launched without the Scout launch options', async ({ loadSite }) => {
    expect(await loadSite()).toBe('proxy');
  });

  test('connects directly when launched with the Scout launch options', async ({ loadSite }) => {
    const { launchOptions } = createPlaywrightConfig({ testDir: '.' }).use ?? {};

    expect(await loadSite(launchOptions)).toBe('site');
  });
});
