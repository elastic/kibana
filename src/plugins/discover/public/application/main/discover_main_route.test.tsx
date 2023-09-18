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
import { DiscoverMainApp } from './discover_main_app';
import { findTestSubject } from '@elastic/eui/lib/test';
import { scopedHistoryMock } from '@kbn/core/public/mocks';
import {
  createCustomizationService,
  DiscoverCustomizationService,
} from '../../customizations/customization_service';

let mockCustomizationService: DiscoverCustomizationService | undefined;

jest.mock('../../customizations', () => {
  const originalModule = jest.requireActual('../../customizations');
  return {
    ...originalModule,
    useDiscoverCustomizationService: () => ({
      customizationService: mockCustomizationService,
      isInitialized: Boolean(mockCustomizationService),
    }),
  };
});

jest.mock('./discover_main_app', () => {
  return {
    DiscoverMainApp: jest.fn().mockReturnValue(<></>),
  };
});

setScopedHistory(scopedHistoryMock.create());

describe('DiscoverMainRoute', () => {
  beforeEach(() => {
    mockCustomizationService = createCustomizationService();
  });

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

  test('renders LoadingIndicator while customizations are loading', async () => {
    mockCustomizationService = undefined;
    const component = mountComponent(true, true);
    await waitFor(() => {
      component.update();
      expect(component.find(DiscoverMainApp).exists()).toBe(false);
    });
    mockCustomizationService = createCustomizationService();
    await waitFor(() => {
      component.setProps({}).update();
      expect(component.find(DiscoverMainApp).exists()).toBe(true);
    });
  });
});

const mountComponent = (hasESData = true, hasUserDataView = true) => {
  const props = {
    isDev: false,
    customizationCallbacks: [],
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
  dataViewsMock.hasData = {
    hasESData: jest.fn(() => Promise.resolve(hasESData)),
    hasUserDataView: jest.fn(() => Promise.resolve(hasUserDataView)),
    hasDataView: jest.fn(() => Promise.resolve(true)),
  };
  return discoverServiceMock;
}

setHeaderActionMenuMounter(jest.fn());
