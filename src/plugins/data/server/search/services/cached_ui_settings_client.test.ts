/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';

import { CachedUiSettingsClient } from './cached_ui_settings_client';

test('fetching uiSettings once for the same key', async () => {
  const request = httpServerMock.createKibanaRequest();
  const soClient = coreMock.createStart().savedObjects.getScopedClient(request);
  const uiSettings = coreMock.createStart().uiSettings.asScopedToClient(soClient);

  const key = 'key';
  const value = 'value';
  const spy = jest
    .spyOn(uiSettings, 'getAll')
    .mockImplementation(() => Promise.resolve({ [key]: value }));

  const cachedUiSettings = new CachedUiSettingsClient(uiSettings);

  const res1 = cachedUiSettings.get(key);
  const res2 = cachedUiSettings.get(key);

  expect(spy).toHaveBeenCalledTimes(1); // check that internally uiSettings.getAll() called only once

  expect(await res1).toBe(value);
  expect(await res2).toBe(value);
});

test('fetching uiSettings once for different keys', async () => {
  const request = httpServerMock.createKibanaRequest();
  const soClient = coreMock.createStart().savedObjects.getScopedClient(request);
  const uiSettings = coreMock.createStart().uiSettings.asScopedToClient(soClient);

  const key1 = 'key1';
  const value1 = 'value1';

  const key2 = 'key2';
  const value2 = 'value2';

  const spy = jest
    .spyOn(uiSettings, 'getAll')
    .mockImplementation(() => Promise.resolve({ [key1]: value1, [key2]: value2 }));

  const cachedUiSettings = new CachedUiSettingsClient(uiSettings);

  const res1 = cachedUiSettings.get(key1);
  const res2 = cachedUiSettings.get(key2);

  expect(spy).toHaveBeenCalledTimes(1); // check that internally uiSettings.getAll() called only once

  expect(await res1).toBe(value1);
  expect(await res2).toBe(value2);
});
