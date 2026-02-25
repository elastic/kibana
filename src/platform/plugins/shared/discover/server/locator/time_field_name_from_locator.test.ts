/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient, SavedObjectsClientContract } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import type { LocatorServicesDeps as Services } from '.';
import { timeFieldNameFromLocatorFactory } from './time_field_name_from_locator';

const coreStart = coreMock.createStart();
let uiSettingsClient: IUiSettingsClient;
let soClient: SavedObjectsClientContract;
let searchSourceStart: ISearchStartSearchSource;
let mockServices: Services;

beforeAll(async () => {
  const dataStartMock = dataPluginMock.createStartContract();
  const request = httpServerMock.createKibanaRequest();
  soClient = coreStart.savedObjects.getScopedClient(request);
  uiSettingsClient = coreMock.createStart().uiSettings.asScopedToClient(soClient);
  searchSourceStart = await dataStartMock.search.searchSource.asScoped(request);

  mockServices = {
    searchSourceStart,
    savedObjects: soClient,
    uiSettings: uiSettingsClient,
  };
});

test(`returns timeFieldName from DiscoverAppLocatorParams`, async () => {
  const params = { dataViewSpec: { timeFieldName: '@timestamp' } };
  const timeFieldNameFromLocatorFn = timeFieldNameFromLocatorFactory(mockServices);
  const timeField = await timeFieldNameFromLocatorFn(params);
  expect(timeField).toBe('@timestamp');
});

test(`returns undefined if there is no timeFieldName in DiscoverAppLocatorParams`, async () => {
  const params = { dataViewSpec: {} };
  const timeFieldNameFromLocatorFn = timeFieldNameFromLocatorFactory(mockServices);
  const timeField = await timeFieldNameFromLocatorFn(params);
  expect(timeField).toBeUndefined();
});

test(`resolves timeFieldName from dataViewId when dataViewSpec is not provided`, async () => {
  soClient.get = jest.fn().mockResolvedValue({
    id: 'test-data-view-id',
    type: 'index-pattern',
    attributes: { timeFieldName: '@timestamp' },
    references: [],
  });

  const params = { dataViewId: 'test-data-view-id' };
  const timeFieldNameFromLocatorFn = timeFieldNameFromLocatorFactory(mockServices);
  const timeField = await timeFieldNameFromLocatorFn(params);
  expect(timeField).toBe('@timestamp');
  expect(soClient.get).toHaveBeenCalledWith('index-pattern', 'test-data-view-id');
});

test(`returns undefined when dataViewId lookup fails`, async () => {
  soClient.get = jest.fn().mockRejectedValue(new Error('Not found'));

  const params = { dataViewId: 'nonexistent-id' };
  const timeFieldNameFromLocatorFn = timeFieldNameFromLocatorFactory(mockServices);
  const timeField = await timeFieldNameFromLocatorFn(params);
  expect(timeField).toBeUndefined();
});

test(`prefers dataViewSpec.timeFieldName over dataViewId lookup`, async () => {
  soClient.get = jest.fn();

  const params = {
    dataViewSpec: { timeFieldName: 'event.timestamp' },
    dataViewId: 'test-data-view-id',
  };
  const timeFieldNameFromLocatorFn = timeFieldNameFromLocatorFactory(mockServices);
  const timeField = await timeFieldNameFromLocatorFn(params);
  expect(timeField).toBe('event.timestamp');
  expect(soClient.get).not.toHaveBeenCalled();
});
