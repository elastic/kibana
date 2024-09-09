/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import { MANAGEMENT_APP_ID } from './contants';
import { ManagementAppLocatorDefinition } from './locator';

test('locator has the right ID', () => {
  const locator = new ManagementAppLocatorDefinition();

  expect(locator.id).toBe(MANAGEMENT_APP_LOCATOR);
});

test('returns management app ID', async () => {
  const locator = new ManagementAppLocatorDefinition();
  const location = await locator.getLocation({
    sectionId: 'a',
    appId: 'b',
  });

  expect(location).toMatchObject({
    app: MANAGEMENT_APP_ID,
  });
});

test('returns Kibana location for section ID and app ID pair', async () => {
  const locator = new ManagementAppLocatorDefinition();
  const location = await locator.getLocation({
    sectionId: 'ingest',
    appId: 'index',
  });

  expect(location).toMatchObject({
    path: '/ingest/index',
    state: {},
  });
});

test('when app ID is not provided, returns path to just the section ID', async () => {
  const locator = new ManagementAppLocatorDefinition();
  const location = await locator.getLocation({
    sectionId: 'data',
  });

  expect(location).toMatchObject({
    path: '/data',
    state: {},
  });
});
