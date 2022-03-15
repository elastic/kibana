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
import { savedSearchMock } from '../../__mocks__/saved_search';
import { SavedObject } from '../../../../../core/types';
import type { DataViewAttributes } from '../../../../data_views/public';
import { setHeaderActionMenuMounter } from '../../kibana_services';
import { findTestSubject } from '@elastic/eui/lib/test';
import { KibanaContextProvider } from '../../../../kibana_react/public';
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

    expect(findTestSubject(component, 'indexPattern-switch-link').text()).toBe(
      indexPatternMock.title
    );
  });
});
