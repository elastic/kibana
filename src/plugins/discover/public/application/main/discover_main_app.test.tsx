/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { DataViewListItem } from '@kbn/data-views-plugin/public';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DiscoverMainApp } from './discover_main_app';
import { DiscoverTopNav } from './components/top_nav/discover_topnav';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { discoverServiceMock } from '../../__mocks__/services';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { getDiscoverStateMock } from '../../__mocks__/discover_state.mock';
import { DiscoverMainProvider } from './services/discover_state_provider';

discoverServiceMock.data.query.timefilter.timefilter.getTime = () => {
  return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
};

describe('DiscoverMainApp', () => {
  test('renders', async () => {
    const dataViewList = [dataViewMock].map((ip) => {
      return { ...ip, ...{ attributes: { title: ip.title } } };
    }) as unknown as DataViewListItem[];
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.actions.setDataView(dataViewMock);
    stateContainer.internalState.transitions.setSavedDataViews(dataViewList);
    const props = {
      stateContainer,
    };
    const history = createMemoryHistory({
      initialEntries: ['/'],
    });

    await act(async () => {
      const component = await mountWithIntl(
        <Router history={history}>
          <KibanaContextProvider services={discoverServiceMock}>
            <DiscoverMainProvider value={stateContainer}>
              <DiscoverMainApp {...props} />
            </DiscoverMainProvider>
          </KibanaContextProvider>
        </Router>
      );

      // wait for lazy modules
      await new Promise((resolve) => setTimeout(resolve, 0));
      await component.update();

      expect(component.find(DiscoverTopNav).exists()).toBe(true);
    });
  });
});
