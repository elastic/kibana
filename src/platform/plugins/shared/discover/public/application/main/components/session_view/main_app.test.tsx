/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { DataViewListItem } from '@kbn/data-views-plugin/public';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DiscoverMainApp } from './main_app';
import { DiscoverTopNav } from '../top_nav/discover_topnav';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { internalStateActions } from '../../state_management/redux';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';

discoverServiceMock.data.query.timefilter.timefilter.getTime = () => {
  return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
};

describe('DiscoverMainApp', () => {
  test('renders', async () => {
    const dataViewList = [dataViewMock].map((ip) => {
      return { ...ip, ...{ attributes: { title: ip.title } } };
    }) as unknown as DataViewListItem[];
    jest.spyOn(discoverServiceMock.dataViews, 'getIdsWithTitle').mockResolvedValue(dataViewList);
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.actions.setDataView(dataViewMock);
    await stateContainer.internalState.dispatch(internalStateActions.loadDataViewList());
    const props = {
      stateContainer,
    };
    const history = createMemoryHistory({
      initialEntries: ['/'],
    });

    await act(async () => {
      const component = mountWithIntl(
        <Router history={history}>
          <DiscoverTestProvider
            services={discoverServiceMock}
            stateContainer={stateContainer}
            runtimeState={{
              currentDataView: dataViewMock,
              adHocDataViews: [],
            }}
          >
            <DiscoverMainApp {...props} />
          </DiscoverTestProvider>
        </Router>
      );

      // wait for lazy modules
      await new Promise((resolve) => setTimeout(resolve, 0));
      component.update();

      expect(component.find(DiscoverTopNav).exists()).toBe(true);
    });
  });
});
