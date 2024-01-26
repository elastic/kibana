/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { ISearchStartSearchSource, SearchSource } from '@kbn/data-plugin/common';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/stubs';
import { SavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import { LocatorServicesDeps as Services } from '.';
import { DiscoverAppLocatorParams } from '../../common';
import { DOC_HIDE_TIME_COLUMN_SETTING } from '@kbn/discover-utils';
import { columnsFromLocatorFactory } from './columns_from_locator';

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
  } as unknown as SavedSearchAttributes,
};

const coreStart = coreMock.createStart();
let uiSettingsClient: IUiSettingsClient;
let soClient: SavedObjectsClientContract;
let searchSourceStart: ISearchStartSearchSource;
let mockServices: Services;
let mockSavedSearch: SavedObject<SavedSearchAttributes>;
let mockDataView: DataView;

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

  mockServices = {
    searchSourceStart,
    savedObjects: soClient,
    uiSettings: uiSettingsClient,
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

test('with search source using columns with default time field', async () => {
  const provider = columnsFromLocatorFactory(mockServices);
  const columns = await provider(mockPayload[0].params);
  expect(columns).toEqual(['timestamp', 'response', 'url', 'clientip', 'machine.os', 'tags']);
});

test('with search source using columns without time field in the DataView', async () => {
  mockDataView = createStubDataView({
    spec: {
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'testIndexRefName',
      timeFieldName: undefined,
    },
  });
  mockSearchSource.setField('index', mockDataView);

  const provider = columnsFromLocatorFactory(mockServices);
  const columns = await provider(mockPayload[0].params);
  expect(columns).toEqual(['response', 'url', 'clientip', 'machine.os', 'tags']);
});

test('with search source using columns when DOC_HIDE_TIME_COLUMN_SETTING is true', async () => {
  const uiSettingsGet = uiSettingsClient.get;
  uiSettingsClient.get = jest.fn().mockImplementation((key: string) => {
    if (key === DOC_HIDE_TIME_COLUMN_SETTING) {
      return true;
    }
    return uiSettingsGet(key);
  });

  const provider = columnsFromLocatorFactory(mockServices);
  const columns = await provider(mockPayload[0].params);
  expect(columns).toEqual(['response', 'url', 'clientip', 'machine.os', 'tags']);
});

test('with saved search containing ["_source"]', async () => {
  mockSavedSearch.attributes.columns = ['_source'];

  const provider = columnsFromLocatorFactory(mockServices);
  const columns = await provider(mockPayload[0].params);
  expect(columns).not.toBeDefined(); // must erase the field since it can not be used for search query
});
