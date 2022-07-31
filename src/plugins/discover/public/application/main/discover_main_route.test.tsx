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
import { setHeaderActionMenuMounter } from '../../kibana_services';
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
jest.mock('./discover_main_app', () => {
  return {
    DiscoverMainApp: jest.fn(),
  };
});
discoverServiceMock.data.dataViews.getCache = jest.fn(() => {
  return Promise.resolve([dataViewMock as unknown as SavedObject<DataViewSavedObjectAttrs>]);
});
discoverServiceMock.data.dataViews.get = jest.fn(() => {
  return Promise.resolve(dataViewMock);
});

discoverServiceMock.data.dataViews.getDefaultDataView = jest.fn(() => {
  return Promise.resolve(dataViewMock);
});

discoverServiceMock.data.search.searchSource.createEmpty = jest.fn(() => {
  const fields: Record<string, unknown> = {};
  const empty = {
    ...searchSourceInstanceMock,
    setField: (key: string, value: unknown) => (fields[key] = value),
    getField: (key: string) => {
      return fields[key];
    },
  };
  return empty as unknown as SearchSource;
});

setHeaderActionMenuMounter(jest.fn());

const mountComponent = () => {
  const props = {
    isDev: false,
  };

  return mountWithIntl(
    <MemoryRouter>
      <KibanaContextProvider services={discoverServiceMock}>
        <DiscoverMainRoute {...props} />
      </KibanaContextProvider>
    </MemoryRouter>
  );
};

describe('DiscoverMainRoute', () => {
  test('renders the main app', async () => {
    const component = mountComponent();

    await waitFor(() => {
      component.update();
      expect(component.find(DiscoverMainApp).exists()).toBe(true);
    });
  });

  test('renders correctly when no ES data / no data views are available', async () => {
    const component = mountComponent();
    discoverServiceMock.data.dataViews.hasData.hasESData = jest.fn(() => Promise.resolve(false));
    discoverServiceMock.data.dataViews.hasData.hasUserDataView = jest.fn(() =>
      Promise.resolve(false)
    );

    await waitFor(() => {
      component.update();
      expect(findTestSubject(component, 'kbnNoDataPage').length).toBe(1);
    });
  });
  test('renders correctly when ES data / no data views are available', async () => {
    const component = mountComponent();
    discoverServiceMock.data.dataViews.hasData.hasESData = jest.fn(() => Promise.resolve(true));
    discoverServiceMock.data.dataViews.hasData.hasUserDataView = jest.fn(() =>
      Promise.resolve(false)
    );

    await waitFor(() => {
      component.update();
      expect(findTestSubject(component, 'noDataViewsPrompt').length).toBe(1);
    });
  });
  test('renders correctly when no ES data / data views are available', async () => {
    const component = mountComponent();
    discoverServiceMock.data.dataViews.hasData.hasESData = jest.fn(() => Promise.resolve(false));
    discoverServiceMock.data.dataViews.hasData.hasUserDataView = jest.fn(() =>
      Promise.resolve(true)
    );

    await waitFor(() => {
      component.update();
      expect(findTestSubject(component, 'kbnNoDataPage').length).toBe(1);
    });
  });
});
