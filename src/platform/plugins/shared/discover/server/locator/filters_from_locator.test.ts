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
import { filtersFromLocatorFactory } from './filters_from_locator';

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

test('creates a time range filter from dataViewSpec.timeFieldName', async () => {
  const params = {
    timeRange: { from: '2024-01-01T00:00:00.000Z', to: '2024-01-02T00:00:00.000Z' },
    dataViewSpec: { timeFieldName: '@timestamp' },
  };

  const filtersFromLocator = filtersFromLocatorFactory(mockServices);
  const filters = await filtersFromLocator(params);

  expect(filters).toEqual([
    {
      meta: {},
      query: {
        range: {
          '@timestamp': {
            format: 'strict_date_optional_time',
            gte: '2024-01-01T00:00:00.000Z',
            lte: '2024-01-02T00:00:00.000Z',
          },
        },
      },
    },
  ]);
});

test('creates a time range filter by resolving dataViewId when dataViewSpec is absent', async () => {
  soClient.get = jest.fn().mockResolvedValue({
    id: 'test-data-view-id',
    type: 'index-pattern',
    attributes: { timeFieldName: '@timestamp' },
    references: [],
  });

  const params = {
    timeRange: { from: 'now-15m', to: 'now' },
    dataViewId: 'test-data-view-id',
  };

  const filtersFromLocator = filtersFromLocatorFactory(mockServices);
  const filters = await filtersFromLocator(params);

  expect(filters).toEqual([
    {
      meta: {},
      query: {
        range: {
          '@timestamp': {
            format: 'strict_date_optional_time',
            gte: 'now-15m',
            lte: 'now',
          },
        },
      },
    },
  ]);
  expect(soClient.get).toHaveBeenCalledWith('index-pattern', 'test-data-view-id');
});

test('does not create a time range filter when timeRange is absent', async () => {
  const params = {
    dataViewSpec: { timeFieldName: '@timestamp' },
  };

  const filtersFromLocator = filtersFromLocatorFactory(mockServices);
  const filters = await filtersFromLocator(params);

  expect(filters).toEqual([]);
});

test('does not create a time range filter when timeFieldName cannot be resolved', async () => {
  const params = {
    timeRange: { from: 'now-15m', to: 'now' },
    dataViewSpec: {},
  };

  const filtersFromLocator = filtersFromLocatorFactory(mockServices);
  const filters = await filtersFromLocator(params);

  expect(filters).toEqual([]);
});

test('includes user-provided filters alongside the time range filter', async () => {
  const userFilter = {
    meta: { alias: 'test' },
    query: { match: { status: 'active' } },
  };

  const params = {
    timeRange: { from: '2024-01-01T00:00:00.000Z', to: '2024-01-02T00:00:00.000Z' },
    dataViewSpec: { timeFieldName: '@timestamp' },
    filters: [userFilter],
  };

  const filtersFromLocator = filtersFromLocatorFactory(mockServices);
  const filters = await filtersFromLocator(params);

  expect(filters).toHaveLength(2);
  expect(filters[0]).toEqual(
    expect.objectContaining({
      query: expect.objectContaining({
        range: expect.objectContaining({ '@timestamp': expect.anything() }),
      }),
    })
  );
  expect(filters[1]).toBe(userFilter);
});

test('gracefully handles dataViewId lookup failure and skips time range filter', async () => {
  soClient.get = jest.fn().mockRejectedValue(new Error('Not found'));

  const params = {
    timeRange: { from: 'now-15m', to: 'now' },
    dataViewId: 'nonexistent-id',
  };

  const filtersFromLocator = filtersFromLocatorFactory(mockServices);
  const filters = await filtersFromLocator(params);

  expect(filters).toEqual([]);
});
