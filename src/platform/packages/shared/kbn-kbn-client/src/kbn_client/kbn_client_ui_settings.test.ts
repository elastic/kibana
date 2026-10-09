/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { KbnClientRequester } from './kbn_client_requester';
import {
  KbnClientUiSettings,
  MAX_UI_SETTINGS_EVENTUAL_CACHE_REFRESH_WAIT_MS,
} from './kbn_client_ui_settings';

describe('KbnClientUiSettings', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('waits for the eventual cache refresh window', async () => {
    const log = new ToolingLog();
    const uiSettings = new KbnClientUiSettings(
      log,
      new KbnClientRequester(log, { url: 'http://localhost:5601' })
    );

    let settled = false;
    const promise = uiSettings.waitForEventualCacheRefresh().then(() => {
      settled = true;
    });

    await jest.advanceTimersByTimeAsync(MAX_UI_SETTINGS_EVENTUAL_CACHE_REFRESH_WAIT_MS - 1);
    expect(settled).toBe(false);

    await jest.advanceTimersByTimeAsync(1);
    await promise;

    expect(settled).toBe(true);
  });
});
