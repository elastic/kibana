/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { SavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import { LocatorServicesDeps as Services } from '.';
import { DiscoverAppLocatorParams } from '../../common';
import { DOC_HIDE_TIME_COLUMN_SETTING } from '@kbn/discover-utils';
import { titleFromLocatorFactory } from './title_from_locator';

const mockSavedSearchId = 'abc-test-123';
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
  const uiSettingsGet = uiSettingsClient.get;
  uiSettingsClient.get = jest.fn().mockImplementation((key: string) => {
    if (key === DOC_HIDE_TIME_COLUMN_SETTING) {
      return false; // this is the default for the real setting
    }
    return uiSettingsGet(key);
  });
});

test(`retrieves title from DiscoverAppLocatorParams`, async () => {
  const testTitle = 'Test Title from DiscoverAppLocatorParams';
  mockPayload = [{ params: { title: testTitle } }];

  const provider = titleFromLocatorFactory(mockServices);
  const title = await provider(mockPayload[0].params);
  expect(title).toBe(testTitle);
});

test(`retrieves title from saved search contents`, async () => {
  const testTitle = 'Test Title from Saved Search Contents';
  mockSavedSearch = {
    ...defaultSavedSearch,
    attributes: { ...defaultSavedSearch.attributes, title: testTitle },
  };

  const provider = titleFromLocatorFactory(mockServices);
  const title = await provider(mockPayload[0].params);
  expect(title).toBe(testTitle);
});

test(`throws error if DiscoverAppLocatorParams do not contain a saved search ID`, async () => {
  const testFn = async () => {
    mockPayload = [{ params: { dataViewId: 'not-yet-supported' } }];
    const provider = titleFromLocatorFactory(mockServices);
    return await provider(mockPayload[0].params);
  };

  expect(testFn).rejects.toEqual(
    new Error('DiscoverAppLocatorParams must contain a saved search reference')
  );
});
