/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { waitFor } from '@testing-library/react';
import { setHeaderActionMenuMounter, setScopedHistory } from '../../kibana_services';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { discoverServiceMock } from '../../__mocks__/services';
import { DiscoverMainRoute } from './discover_main_route';
import { MemoryRouter } from 'react-router-dom';
import { dataViewMock } from '../../__mocks__/data_view';
import { SavedObject } from '@kbn/core/public';
import { DataViewSavedObjectAttrs } from '@kbn/data-views-plugin/common';
import { DiscoverMainApp } from './discover_main_app';
import { SearchSource } from '@kbn/data-plugin/common';
import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { findTestSubject } from '@elastic/eui/lib/test';
import { scopedHistoryMock } from '@kbn/core/public/mocks';
jest.mock('./discover_main_app', () => {
  return {
    DiscoverMainApp: jest.fn().mockReturnValue(<></>),
  };
});

setScopedHistory(scopedHistoryMock.create());
describe('DiscoverMainRoute', () => {
  test('renders the main app when hasESData=true & hasUserDataView=true ', async () => {
    const component = mountComponent(true, true);

    await waitFor(() => {
      component.update();
      expect(component.find(DiscoverMainApp).exists()).toBe(true);
    });
  });

  test('renders no data page when hasESData=false & hasUserDataView=false', async () => {
    const component = mountComponent(false, false);

    await waitFor(() => {
      component.update();
      expect(findTestSubject(component, 'kbnNoDataPage').length).toBe(1);
    });
  });
  test('renders no data view when hasESData=true & hasUserDataView=false', async () => {
    const component = mountComponent(true, false);

    await waitFor(() => {
      component.update();
      expect(findTestSubject(component, 'noDataViewsPrompt').length).toBe(1);
    });
  });
  // skipped because this is the case that never ever should happen, it happened once and was fixed in
  // https://github.com/elastic/kibana/pull/137824
  test.skip('renders no data page when hasESData=false & hasUserDataView=true', async () => {
    const component = mountComponent(false, true);

    await waitFor(() => {
      component.update();
      expect(findTestSubject(component, 'kbnNoDataPage').length).toBe(1);
    });
  });
});
const mountComponent = (hasESData = true, hasUserDataView = true) => {
  const props = {
    isDev: false,
  };

  return mountWithIntl(
    <MemoryRouter>
      <KibanaContextProvider services={getServicesMock(hasESData, hasUserDataView)}>
        <DiscoverMainRoute {...props} />
      </KibanaContextProvider>
    </MemoryRouter>
  );
};
function getServicesMock(hasESData = true, hasUserDataView = true) {
  const dataViewsMock = discoverServiceMock.data.dataViews;
  dataViewsMock.getCache = jest.fn(() => {
    return Promise.resolve([dataViewMock as unknown as SavedObject<DataViewSavedObjectAttrs>]);
  });
  dataViewsMock.get = jest.fn(() => Promise.resolve(dataViewMock));
  dataViewsMock.getDefaultDataView = jest.fn(() => Promise.resolve(dataViewMock));
  dataViewsMock.hasData = {
    hasESData: jest.fn(() => Promise.resolve(hasESData)),
    hasUserDataView: jest.fn(() => Promise.resolve(hasUserDataView)),
    hasDataView: jest.fn(() => Promise.resolve(true)),
  };
  dataViewsMock.refreshFields = jest.fn();

  discoverServiceMock.data.search.searchSource.createEmpty = jest.fn(() => {
    const fields: Record<string, unknown> = {};
    const empty = {
      ...searchSourceInstanceMock,
      setField: (key: string, value: unknown) => (fields[key] = value),
      getField: (key: string) => fields[key],
    };
    return empty as unknown as SearchSource;
  });
  return discoverServiceMock;
}

setHeaderActionMenuMounter(jest.fn());
