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
  const locator = new ManagementAppLocator();

  expect(locator.id).toBe(MANAGEMENT_APP_LOCATOR);
});

test('returns management app ID', async () => {
  const locator = new ManagementAppLocator();
  const location = await locator.getLocation({
    sectionId: 'a',
    appId: 'b',
  });

  expect(location).toMatchObject({
    app: MANAGEMENT_APP_ID,
  });
});

test('returns Kibana location for section ID and app ID pair', async () => {
  const locator = new ManagementAppLocator();
  const location = await locator.getLocation({
    sectionId: 'ingest',
    appId: 'index',
  });

  expect(location).toMatchObject({
    route: '/ingest/index',
    state: {},
  });
});

test('when app ID is not provided, returns path to just the section ID', async () => {
  const locator = new ManagementAppLocator();
  const location = await locator.getLocation({
    sectionId: 'data',
  });

  expect(location).toMatchObject({
    route: '/data',
    state: {},
  });
});
