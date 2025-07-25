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
import type { ISearchStartSearchSource, SearchSource } from '@kbn/data-plugin/common';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/stubs';
import type { SavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import type { LocatorServicesDeps as Services } from '.';
import type { DiscoverAppLocatorParams } from '../../common';
import { DOC_HIDE_TIME_COLUMN_SETTING } from '@kbn/discover-utils';
import { columnsFromLocatorFactory } from './columns_from_locator';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';

const mockSavedSearchId = 'abc-test-123';
const mockSavedSearchAttributes: Omit<SavedSearchAttributes, 'title' | 'description'> = {
  columns: ['response', 'url', 'clientip', 'machine.os', 'tags'],
  sort: [['test', '134']],
  kibanaSavedObjectMeta: {
    searchSourceJSON:
      '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"testIndexRefName"}',
  },
  grid: {},
  hideChart: false,
  isTextBasedQuery: false,
};
// object returned by savedObjectsClient.get in testing
function getMockSavedSearch(
  attributes?: Partial<SavedSearchAttributes>
): SavedObject<DiscoverSessionAttributes> {
  return {
    type: 'search',
    id: mockSavedSearchId,
    attributes: {
      title: '[Logs] Visits',
      description: '',
      tabs: [
        {
          id: 'tab_0',
          label: 'label_0',
          attributes: {
            ...mockSavedSearchAttributes,
            ...attributes,
          },
        },
      ],
    },
    references: [
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: 'testIndexRefName',
        type: 'index-pattern',
      },
    ],
  };
}

const coreStart = coreMock.createStart();
let uiSettingsClient: IUiSettingsClient;
let soClient: SavedObjectsClientContract;
let searchSourceStart: ISearchStartSearchSource;
let mockServices: Services;
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
});

beforeEach(() => {
  mockPayload = [{ params: { savedSearchId: mockSavedSearchId } }];

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

  soClient.get = jest.fn().mockResolvedValue(getMockSavedSearch());
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
  soClient.get = jest.fn().mockResolvedValue(getMockSavedSearch({ columns: ['_source'] }));

  const provider = columnsFromLocatorFactory(mockServices);
  const columns = await provider(mockPayload[0].params);
  expect(columns).not.toBeDefined(); // must erase the field since it can not be used for search query
});
