/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import { DiscoverMainApp } from './discover_main_app';
import { DiscoverTopNav } from './components/top_nav/discover_topnav';
import { savedSearchMock } from '../../__mocks__/saved_search';
import { SavedObject } from '@kbn/core/types';
import type { DataViewAttributes } from '@kbn/data-views-plugin/public';
import { setHeaderActionMenuMounter } from '../../kibana_services';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { discoverServiceMock } from '../../__mocks__/services';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';

setHeaderActionMenuMounter(jest.fn());

describe('DiscoverMainApp', () => {
  test('renders', () => {
    const indexPatternList = [indexPatternMock].map((ip) => {
      return { ...ip, ...{ attributes: { title: ip.title } } };
    }) as unknown as Array<SavedObject<DataViewAttributes>>;
    const props = {
      indexPatternList,
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
    expect(component.find(DiscoverTopNav).prop('indexPattern')).toEqual(indexPatternMock);
  });
});
