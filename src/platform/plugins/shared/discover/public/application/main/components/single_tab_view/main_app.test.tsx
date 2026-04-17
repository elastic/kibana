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
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DiscoverMainApp } from './main_app';
import { DiscoverTopNav } from '../top_nav/discover_topnav';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { internalStateActions } from '../../state_management/redux';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';

describe('DiscoverMainApp', () => {
  test('renders', async () => {
    const services = createDiscoverServicesMock();
    services.data.query.timefilter.timefilter.getTime = () => {
      return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
    };

    const toolkit = getDiscoverInternalStateMock({
      services,
      persistedDataViews: [dataViewMock],
    });

    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });

    toolkit.internalState.dispatch(
      internalStateActions.assignNextDataView({
        tabId: toolkit.getCurrentTab().id,
        dataView: dataViewMock,
      })
    );

    const history = createMemoryHistory({
      initialEntries: ['/'],
    });

    await act(async () => {
      const component = mountWithIntl(
        <Router history={history}>
          <DiscoverToolkitTestProvider toolkit={toolkit}>
            <DiscoverMainApp />
          </DiscoverToolkitTestProvider>
        </Router>
      );

      // wait for lazy modules
      await new Promise((resolve) => setTimeout(resolve, 0));
      component.update();

      expect(component.find(DiscoverTopNav).exists()).toBe(true);
    });
  });
});
