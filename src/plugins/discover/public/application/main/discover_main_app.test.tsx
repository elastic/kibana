/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { dataViewMock } from '../../__mocks__/data_view';
import { DiscoverMainApp } from './discover_main_app';
import { DiscoverTopNav } from './components/top_nav/discover_topnav';
import { setHeaderActionMenuMounter, setUrlTracker } from '../../kibana_services';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { discoverServiceMock } from '../../__mocks__/services';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { urlTrackerMock } from '../../__mocks__/url_tracker.mock';
import { getDiscoverStateMock } from '../../__mocks__/discover_state.mock';
import { DiscoverMainProvider } from './services/discover_state_provider';

setHeaderActionMenuMounter(jest.fn());
setUrlTracker(urlTrackerMock);

describe('DiscoverMainApp', () => {
  test('renders', () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.actions.setDataView(dataViewMock);
    const props = {
      stateContainer,
    };
    const history = createMemoryHistory({
      initialEntries: ['/'],
    });

    const component = mountWithIntl(
      <Router history={history}>
        <KibanaContextProvider services={discoverServiceMock}>
          <DiscoverMainProvider value={props.stateContainer}>
            <DiscoverMainApp {...props} />
          </DiscoverMainProvider>
        </KibanaContextProvider>
      </Router>
    );

    expect(component.find(DiscoverTopNav).exists()).toBe(true);
  });
});
