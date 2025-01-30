/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode } from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { waitFor } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { discoverServiceMock } from '../../__mocks__/services';
import { DiscoverMainRoute, MainRouteProps } from './discover_main_route';
import { MemoryRouter } from 'react-router-dom';
import { DiscoverMainApp } from './discover_main_app';
import { findTestSubject } from '@elastic/eui/lib/test';
import {
  createCustomizationService,
  DiscoverCustomizationService,
} from '../../customizations/customization_service';
import { mockCustomizationContext } from '../../customizations/__mocks__/customization_context';
import { DataViewSpec } from '@kbn/data-views-plugin/common';
import { MainHistoryLocationState } from '../../../common';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';

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

let mockRootProfileLoading = false;
let mockDefaultAdHocDataViews: DataViewSpec[] = [];

jest.mock('../../context_awareness', () => {
  const originalModule = jest.requireActual('../../context_awareness');
  return {
    ...originalModule,
    useRootProfile: () => ({
      rootProfileLoading: mockRootProfileLoading,
      AppWrapper: ({ children }: { children: ReactNode }) => <>{children}</>,
      getDefaultAdHocDataViews: () => mockDefaultAdHocDataViews,
    }),
  };
});

describe('DiscoverMainRoute', () => {
  beforeEach(() => {
    mockCustomizationService = createCustomizationService();
    mockRootProfileLoading = false;
    mockDefaultAdHocDataViews = [];
  });

  test('renders the main app when hasESData=true & hasUserDataView=true ', async () => {
    const component = mountComponent(true, true);

    await waitFor(() => {
      component.update();
      expect(component.find(DiscoverMainApp).exists()).toBe(true);
    });
  });

  test('renders the main app when ad hoc data views exist', async () => {
    mockDefaultAdHocDataViews = [{ id: 'test', title: 'test' }];
    const component = mountComponent(true, false);

    await waitFor(() => {
      component.update();
      expect(component.find(DiscoverMainApp).exists()).toBe(true);
    });
  });

  test('renders the main app when a data view spec is passed through location state', async () => {
    const component = mountComponent(true, false, { dataViewSpec: { id: 'test', title: 'test' } });

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

  test('renders LoadingIndicator while root profile is loading', async () => {
    mockRootProfileLoading = true;
    const component = mountComponent(true, true);
    await waitFor(() => {
      component.update();
      expect(component.find(DiscoverMainApp).exists()).toBe(false);
    });
    mockRootProfileLoading = false;
    await waitFor(() => {
      component.setProps({}).update();
      expect(component.find(DiscoverMainApp).exists()).toBe(true);
    });
  });
});

const mountComponent = (
  hasESData = true,
  hasUserDataView = true,
  locationState?: MainHistoryLocationState
) => {
  const props: MainRouteProps = {
    customizationCallbacks: [],
    customizationContext: mockCustomizationContext,
  };

  return mountWithIntl(
    <MemoryRouter>
      <KibanaContextProvider services={getServicesMock(hasESData, hasUserDataView, locationState)}>
        <DiscoverMainRoute {...props} />
      </KibanaContextProvider>
    </MemoryRouter>
  );
};

function getServicesMock(
  hasESData = true,
  hasUserDataView = true,
  locationState?: MainHistoryLocationState
) {
  const dataViewsMock = discoverServiceMock.data.dataViews;
  dataViewsMock.hasData = {
    hasESData: jest.fn(() => Promise.resolve(hasESData)),
    hasUserDataView: jest.fn(() => Promise.resolve(hasUserDataView)),
    hasDataView: jest.fn(() => Promise.resolve(true)),
  };
  dataViewsMock.create = jest.fn().mockResolvedValue(dataViewMock);
  discoverServiceMock.core.http.get = jest.fn().mockResolvedValue({});
  discoverServiceMock.getScopedHistory = jest.fn().mockReturnValue({
    location: {
      state: locationState,
    },
  });
  return discoverServiceMock;
}
