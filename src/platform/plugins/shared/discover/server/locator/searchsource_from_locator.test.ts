/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { ISearchStartSearchSource, SearchSource, TimeRange } from '@kbn/data-plugin/common';
import type { Filter } from '@kbn/es-query';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import type { DataView, DataViewsService } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/stubs';
import type { SavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionTabAttributes } from '@kbn/saved-search-plugin/server';
import type { LocatorServicesDeps as Services } from '.';
import type { DiscoverAppLocatorParams } from '../../common';
import { DOC_HIDE_TIME_COLUMN_SETTING } from '@kbn/discover-utils';
import { searchSourceFromLocatorFactory } from './searchsource_from_locator';

const mockSavedSearchId = 'abc-test-123';
// object returned by savedObjectsClient.get in testing
const defaultSavedSearch: SavedObject<SavedSearchAttributes> = {
  type: 'search',
  id: mockSavedSearchId,
  references: [
    { id: '90943e30-9a47-11e8-b64d-95841ca0b247', name: 'testIndexRefName', type: 'index-pattern' },
  ],
  attributes: {
    title: '[Logs] Visits',
    description: '',
    columns: ['response', 'url', 'clientip', 'machine.os', 'tags'],
    sort: [['test', '134']] as unknown as [],
    kibanaSavedObjectMeta: {
      searchSourceJSON:
        '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"testIndexRefName"}',
    },
    tabs: [
      {
        id: 'tab-1',
        label: 'Tab 1',
        attributes: {
          columns: ['response', 'url', 'clientip', 'machine.os', 'tags'],
          sort: [['test', '134']],
          kibanaSavedObjectMeta: {
            searchSourceJSON:
              '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"testIndexRefName"}',
          },
        },
      },
    ],
  } as unknown as SavedSearchAttributes,
};

const coreStart = coreMock.createStart();
let uiSettingsClient: IUiSettingsClient;
let soClient: SavedObjectsClientContract;
let searchSourceStart: ISearchStartSearchSource;
let mockServices: Services;
let mockSavedSearch: SavedObject<SavedSearchAttributes>;
let mockDataView: DataView;
let dataViewsService: jest.Mocked<Pick<DataViewsService, 'get'>>;

// mock search source belonging to the saved search
let mockSearchSource: SearchSource;

// mock params containing the discover app locator
let mockPayload: Array<{ params: DiscoverAppLocatorParams }>;

beforeAll(async () => {
  const dataStartMock = dataPluginMock.createStartContract();
  const request = httpServerMock.createKibanaRequest();
  soClient = coreStart.savedObjects.getScopedClient(request);
  uiSettingsClient = coreMock.createStart().uiSettings.asScopedToClient(soClient);
  searchSourceStart = await dataStartMock.search.searchSource.asScoped(request);

  dataViewsService = { get: jest.fn() };

  mockServices = {
    searchSourceStart,
    savedObjects: soClient,
    uiSettings: uiSettingsClient,
    dataViewsService: dataViewsService as unknown as DataViewsService,
  };

  const soClientGet = soClient.get;
  soClient.get = jest.fn().mockImplementation((type, id) => {
    if (id === mockSavedSearchId) return mockSavedSearch;
    return soClientGet(type, id);
  });
});

beforeEach(() => {
  mockPayload = [{ params: { savedSearchId: mockSavedSearchId } }];
  mockSavedSearch = { ...defaultSavedSearch, attributes: { ...defaultSavedSearch.attributes } };

  mockDataView = createStubDataView({
    spec: {
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'testIndexRefName',
      timeFieldName: 'timestamp',
    },
  });

  mockSearchSource = createSearchSourceMock();
  mockSearchSource.setField('index', mockDataView);
  searchSourceStart.create = jest.fn().mockResolvedValue(mockSearchSource);

  const uiSettingsGet = uiSettingsClient.get;
  uiSettingsClient.get = jest.fn().mockImplementation((key: string) => {
    if (key === DOC_HIDE_TIME_COLUMN_SETTING) {
      return false; // this is the default for the real setting
    }
    return uiSettingsGet(key);
  });
});

const createDataViewWithSortableField = () =>
  createStubDataView({
    spec: {
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'testIndexRefName',
      timeFieldName: 'timestamp',
      fields: {
        response: {
          name: 'response',
          type: 'string',
          esTypes: ['keyword'],
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
        },
      },
    },
  });

test('with saved search containing a filter', async () => {
  const testFilter = {
    meta: { index: 'logstash-*' },
    query: { term: { host: 'elastic.co' } },
  };
  mockSearchSource.setField('filter', testFilter);

  const provider = searchSourceFromLocatorFactory(mockServices);
  const searchSource = await provider(mockPayload[0].params);
  expect(searchSource.getSerializedFields().filter).toEqual([testFilter]);
});

test('with locator params containing a filter', async () => {
  const testFilter = {
    meta: { index: 'logstash-*' },
    query: { term: { host: 'elastic.co' } },
  };
  mockPayload = [{ params: { savedSearchId: mockSavedSearchId, filters: [testFilter] } }];

  const provider = searchSourceFromLocatorFactory(mockServices);
  const searchSource = await provider(mockPayload[0].params);
  expect(searchSource.getSerializedFields().filter).toEqual([testFilter]);
});

test('with saved search and locator params both containing a filter', async () => {
  // search source belonging to the saved search
  mockSearchSource.setField('filter', {
    meta: { index: 'logstash-*' },
    query: { term: { host: 'elastic.co' } },
  });

  // locator params
  mockPayload = [
    {
      params: {
        savedSearchId: mockSavedSearchId,
        filters: [
          {
            meta: { index: 'logstash-*' },
            query: { term: { os: 'Palm Pilot' } },
          },
        ],
      },
    },
  ];

  const provider = searchSourceFromLocatorFactory(mockServices);
  const searchSource = await provider(mockPayload[0].params);
  expect(searchSource.getSerializedFields().filter).toEqual([
    { meta: { index: 'logstash-*' }, query: { term: { host: 'elastic.co' } } },
    { meta: { index: 'logstash-*' }, query: { term: { os: 'Palm Pilot' } } },
  ]);
});

test('with locator params containing a timeRange', async () => {
  const testTimeRange = { from: 'now-15m', to: 'now', mode: 'absolute' as const };
  mockPayload = [{ params: { savedSearchId: mockSavedSearchId, timeRange: testTimeRange } }];

  const provider = searchSourceFromLocatorFactory(mockServices);
  const searchSource = await provider(mockPayload[0].params);
  expect(searchSource.getSerializedFields().filter).toEqual([
    {
      meta: {
        index: '90943e30-9a47-11e8-b64d-95841ca0b247',
        field: 'timestamp',
        params: {},
        type: 'range',
      },
      query: {
        range: { timestamp: { format: 'strict_date_optional_time', gte: 'now-15m', lte: 'now' } },
      },
    },
  ]);
});

test('with saved search containing ["_source"]', async () => {
  mockSavedSearch = {
    ...defaultSavedSearch,
    attributes: {
      ...defaultSavedSearch.attributes,
      tabs: [
        {
          id: 'tab-1',
          label: 'Tab 1',
          attributes: {
            columns: ['_source'],
            sort: [['test', '134']],
            kibanaSavedObjectMeta: {
              searchSourceJSON:
                '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"testIndexRefName"}',
            },
          } as DiscoverSessionTabAttributes,
        },
      ],
    },
  };

  const provider = searchSourceFromLocatorFactory(mockServices);
  const searchSource = await provider(mockPayload[0].params);
  expect(searchSource.getSerializedFields().fields).toEqual([
    { field: '*', include_unmapped: true },
  ]);
});

test('with saved search without columns and locator params containing a timeRange', async () => {
  mockSavedSearch = {
    ...defaultSavedSearch,
    attributes: {
      ...defaultSavedSearch.attributes,
      tabs: [
        {
          id: 'tab-1',
          label: 'Tab 1',
          attributes: {
            columns: [],
            sort: [['test', '134']],
            kibanaSavedObjectMeta: {
              searchSourceJSON:
                '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"testIndexRefName"}',
            },
          } as unknown as DiscoverSessionTabAttributes,
        },
      ],
    },
  };
  const testTimeRange = { from: 'now-15m', to: 'now', mode: 'absolute' as const };

  const provider = searchSourceFromLocatorFactory(mockServices);
  const searchSource = await provider({
    savedSearchId: mockSavedSearchId,
    timeRange: testTimeRange,
  });

  expect(searchSource.getSerializedFields().filter).toEqual([
    {
      meta: {
        index: '90943e30-9a47-11e8-b64d-95841ca0b247',
        field: 'timestamp',
        params: {},
        type: 'range',
      },
      query: {
        range: { timestamp: { format: 'strict_date_optional_time', gte: 'now-15m', lte: 'now' } },
      },
    },
  ]);
});

describe('with locator params containing a dataViewId (unsaved search)', () => {
  beforeEach(() => {
    mockSearchSource.removeField('index');
    dataViewsService.get.mockResolvedValue(mockDataView);
  });

  test('builds the search source from the locator params', async () => {
    const testTimeRange = { from: 'now-15m', to: 'now', mode: 'absolute' as const };
    const testQuery = { query: 'response:200', language: 'kuery' };

    const provider = searchSourceFromLocatorFactory(mockServices);
    const searchSource = await provider({
      dataViewId: mockDataView.id,
      columns: ['response', 'url'],
      timeRange: testTimeRange,
      query: testQuery,
    });

    const fields = searchSource.getSerializedFields();
    expect(dataViewsService.get).toHaveBeenCalledWith(mockDataView.id);
    expect(searchSource.getField('index')).toBe(mockDataView);
    expect(fields.fields).toEqual([
      { field: 'timestamp', include_unmapped: true },
      { field: 'response', include_unmapped: true },
      { field: 'url', include_unmapped: true },
    ]);
    expect(fields.query).toEqual(testQuery);
    expect(fields.filter).toEqual([
      {
        meta: { index: mockDataView.id, field: 'timestamp', params: {}, type: 'range' },
        query: {
          range: { timestamp: { format: 'strict_date_optional_time', gte: 'now-15m', lte: 'now' } },
        },
      },
    ]);
  });

  test('uses all fields without columns', async () => {
    const provider = searchSourceFromLocatorFactory(mockServices);
    const searchSource = await provider({ dataViewId: mockDataView.id });
    expect(searchSource.getSerializedFields().fields).toEqual([
      { field: '*', include_unmapped: true },
    ]);
  });

  test('uses the sort of the locator params', async () => {
    dataViewsService.get.mockResolvedValue(createDataViewWithSortableField());
    const provider = searchSourceFromLocatorFactory(mockServices);
    const searchSource = await provider({
      dataViewId: mockDataView.id,
      sort: [['response', 'asc']],
    });
    expect(searchSource.getField('sort')).toEqual([{ response: 'asc' }]);
  });
});

test('sort of the locator params takes precedence over the saved search sort', async () => {
  mockSearchSource.setField('index', createDataViewWithSortableField());
  const provider = searchSourceFromLocatorFactory(mockServices);
  const searchSource = await provider({
    savedSearchId: mockSavedSearchId,
    sort: [['response', 'asc']],
  });
  expect(searchSource.getField('sort')).toEqual([{ response: 'asc' }]);
});

test('columns of the locator params take precedence over the saved search columns', async () => {
  const provider = searchSourceFromLocatorFactory(mockServices);
  const searchSource = await provider({ savedSearchId: mockSavedSearchId, columns: ['url'] });
  expect(searchSource.getSerializedFields().fields).toEqual([
    { field: 'timestamp', include_unmapped: true },
    { field: 'url', include_unmapped: true },
  ]);
});

test('dataViewId of the locator params takes precedence over the saved search data view', async () => {
  const otherDataView = createStubDataView({
    spec: { id: 'other-data-view', name: 'other', timeFieldName: 'event.created' },
  });
  dataViewsService.get.mockResolvedValue(otherDataView);

  const provider = searchSourceFromLocatorFactory(mockServices);
  const searchSource = await provider({
    savedSearchId: mockSavedSearchId,
    dataViewId: 'other-data-view',
  });

  expect(searchSource.getField('index')).toBe(otherDataView);
  expect(searchSource.getSerializedFields().fields?.[0]).toEqual({
    field: 'event.created',
    include_unmapped: true,
  });
});

test('throws without a saved search or data view reference', async () => {
  const provider = searchSourceFromLocatorFactory(mockServices);
  await expect(provider({ columns: ['url'] })).rejects.toThrow(
    'DiscoverAppLocatorParams must contain a saved search reference'
  );
});

test('expands nested field roots to their leaf fields and includes unmapped fields', async () => {
  const dataViewWithNestedField = createStubDataView({
    spec: {
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'testIndexRefName',
      timeFieldName: 'timestamp',
      fields: {
        'items.name': {
          name: 'items.name',
          type: 'string',
          esTypes: ['keyword'],
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
          subType: { nested: { path: 'items' } },
        },
      },
    },
  });
  mockSearchSource.setField('index', dataViewWithNestedField);

  const provider = searchSourceFromLocatorFactory(mockServices);
  const searchSource = await provider({
    savedSearchId: mockSavedSearchId,
    columns: ['items', 'extra_unmapped'],
  });

  expect(searchSource.getSerializedFields().fields).toEqual([
    { field: 'timestamp', include_unmapped: true },
    { field: 'items.*', include_unmapped: true },
    { field: 'extra_unmapped', include_unmapped: true },
  ]);
});

describe('locator params validation', () => {
  test('throws for columns that are not an array of strings', async () => {
    const provider = searchSourceFromLocatorFactory(mockServices);
    await expect(
      provider({
        savedSearchId: mockSavedSearchId,
        columns: ['url', 1] as unknown as string[],
      })
    ).rejects.toThrow('"columns" must be an array of strings');
  });

  test.each([
    ['not an array', 'bytes'],
    ['an item that is not a pair', [['bytes']]],
    ['an invalid direction', [['bytes', 'ascending']]],
    ['a field that is not a string', [[1, 'asc']]],
  ])('throws for sort with %s', async (_description, sort) => {
    const provider = searchSourceFromLocatorFactory(mockServices);
    await expect(
      provider({ savedSearchId: mockSavedSearchId, sort: sort as unknown as string[][] })
    ).rejects.toThrow('"sort" must be an array of [field, "asc" | "desc"] pairs');
  });

  test('accepts an empty sort', async () => {
    const provider = searchSourceFromLocatorFactory(mockServices);
    await expect(provider({ savedSearchId: mockSavedSearchId, sort: [] })).resolves.toBeDefined();
  });
});

describe('filters', () => {
  test('ignores empty filters and does not mutate the filters of the locator params', async () => {
    const testFilter = {
      meta: { index: 'logstash-*' },
      query: { term: { host: 'elastic.co' } },
    };
    const provider = searchSourceFromLocatorFactory(mockServices);
    const searchSource = await provider({
      savedSearchId: mockSavedSearchId,
      filters: [null, testFilter] as unknown as Filter[],
    });

    const [filter] = searchSource.getSerializedFields().filter as Filter[];
    expect(filter).toEqual(testFilter);
    expect(filter).not.toBe(testFilter);
  });

  test('does not add a time range filter if the time range is incomplete', async () => {
    const provider = searchSourceFromLocatorFactory(mockServices);
    const searchSource = await provider({
      savedSearchId: mockSavedSearchId,
      timeRange: { from: 'now-15m' } as unknown as TimeRange,
    });

    expect(searchSource.getSerializedFields().filter).toBeUndefined();
  });
});

describe('errors', () => {
  test('adds context to the message and keeps the original error as the cause', async () => {
    const originalError = Object.assign(new Error('Saved object not found'), { statusCode: 404 });
    dataViewsService.get.mockRejectedValueOnce(originalError);

    const provider = searchSourceFromLocatorFactory(mockServices);
    const error = await provider({ dataViewId: 'missing-data-view' }).catch((e) => e);

    expect(error.cause).toBe(originalError);
    expect(error.message).toBe(
      'Failed to resolve the search from DiscoverAppLocatorParams (dataViewId: missing-data-view): Saved object not found'
    );
    // the original error is not modified
    expect(originalError.message).toBe('Saved object not found');
  });
});
