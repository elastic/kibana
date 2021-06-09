/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MANAGEMENT_APP_ID } from './contants';
import { ManagementAppLocator, MANAGEMENT_APP_LOCATOR } from './locator';

test('locator has the right ID', () => {
  const locator = new ManagementAppLocator({});

  expect(locator.id).toBe(MANAGEMENT_APP_LOCATOR);
});

test('returns management app ID', async () => {
  const locator = new ManagementAppLocator({});
  const location = await locator.getLocation({
    sectionId: 'a',
    appId: 'b',
  });

  expect(location).toMatchObject({
    app: MANAGEMENT_APP_ID,
  });
});

test('returns Kibana location for section ID and app ID pair', async () => {
  const locator = new ManagementAppLocator({});
  const location = await locator.getLocation({
    sectionId: 'ingest',
    appId: 'index',
  });

  expect(location).toMatchObject({
    route: '/ingest/index',
    state: {},
  });
});

describe('when section ID is not provided', () => {
  test('resolves app path using .getAppBasePath()', async () => {
    const locator = new ManagementAppLocator({
      getAppBasePath: jest.fn(async (appId) => '/x/' + appId),
    });
    const location = await locator.getLocation({
      appId: 'y',
    });

    expect(location).toMatchObject({
      app: MANAGEMENT_APP_ID,
      route: '/x/y',
      state: {},
    });
  });

  test('returns empty path if .getAppBasePath() is not provided', async () => {
    const locator = new ManagementAppLocator({});
    const location = await locator.getLocation({
      appId: 'y',
    });

    expect(location).toMatchObject({
      app: MANAGEMENT_APP_ID,
      route: '',
      state: {},
    });
  });
});
