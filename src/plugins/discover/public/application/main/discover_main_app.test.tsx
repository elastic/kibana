/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { DataViewListItem } from '@kbn/data-views-plugin/public';
import { dataViewMock } from '../../__mocks__/data_view';
import { DiscoverMainApp } from './discover_main_app';
import { DiscoverTopNav } from './components/top_nav/discover_topnav';
import { savedSearchMock } from '../../__mocks__/saved_search';
import { setHeaderActionMenuMounter, setUrlTracker } from '../../kibana_services';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { discoverServiceMock } from '../../__mocks__/services';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { urlTrackerMock } from '../../__mocks__/url_tracker.mock';

setHeaderActionMenuMounter(jest.fn());
setUrlTracker(urlTrackerMock);

describe('DiscoverMainApp', () => {
  test('renders', () => {
    const dataViewList = [dataViewMock].map((ip) => {
      return { ...ip, ...{ attributes: { title: ip.title } } };
    }) as unknown as DataViewListItem[];
    const props = {
      dataViewList,
      savedSearch: savedSearchMock,
    };
    const history = createMemoryHistory({
      initialEntries: ['/'],
    });

    const component = mountWithIntl(
      <Router history={history}>
        <KibanaContextProvider services={discoverServiceMock}>
          <DiscoverMainApp {...props} />
        </KibanaContextProvider>
      </Router>
    );

    expect(component.find(DiscoverTopNav).exists()).toBe(true);
    expect(component.find(DiscoverTopNav).prop('dataView')).toEqual(dataViewMock);
  });
});
