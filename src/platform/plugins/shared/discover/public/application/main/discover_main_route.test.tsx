/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen, waitFor } from '@testing-library/react';
import { discoverServiceMock } from '../../__mocks__/services';
import type { MainRouteProps } from './discover_main_route';
import { DiscoverMainRoute } from './discover_main_route';
import { MemoryRouter } from 'react-router-dom';
import type { DiscoverCustomizationService } from '../../customizations/customization_service';
import { createCustomizationService } from '../../customizations/customization_service';
import { mockCustomizationContext } from '../../customizations/__mocks__/customization_context';
import type { MainHistoryLocationState } from '../../../common';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { RootProfileState } from '../../context_awareness';
import { DiscoverTestProvider } from '../../__mocks__/test_provider';
import type { AppMountParameters } from '@kbn/core/public';
import { createRuntimeStateManager } from './state_management/redux';
import { BehaviorSubject } from 'rxjs';
import {
  getRuntimeStateManagerMock,
  getTabRuntimeStateMock,
} from './state_management/redux/__mocks__/runtime_state.mocks';
import { type DiscoverStateContainer } from './state_management/discover_state';
import type { AppLeaveActionFactory } from '@kbn/core-application-browser';
import { getDiscoverStateMock } from '../../__mocks__/discover_state.mock';

let mockCustomizationService: Promise<DiscoverCustomizationService> | undefined;

jest.mock('../../customizations', () => {
  const originalModule = jest.requireActual('../../customizations');
  return {
    ...originalModule,
    useDiscoverCustomizationService: () => () => mockCustomizationService,
  };
});

jest.mock('./components/single_tab_view/main_app', () => {
  return {
    DiscoverMainApp: jest.fn(() => <div data-test-subj="discover-main-app" />),
  };
});

const defaultRootProfileState: RootProfileState = {
  rootProfileLoading: false,
  AppWrapper: ({ children }: { children?: ReactNode }) => <>{children}</>,
  getDefaultAdHocDataViews: () => [],
};
let mockRootProfileState: RootProfileState = defaultRootProfileState;

jest.mock('../../context_awareness', () => {
  const originalModule = jest.requireActual('../../context_awareness');
  return {
    ...originalModule,
    useRootProfile: () => mockRootProfileState,
  };
});

jest.mock('./state_management/redux/runtime_state', () => ({
  ...jest.requireActual('./state_management/redux/runtime_state'),
  createRuntimeStateManager: jest.fn(),
}));
const mockCreateRuntimeStateManager = jest.mocked(createRuntimeStateManager);

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

const setupComponent = ({
  hasESData = true,
  hasUserDataView = true,
  locationState,
  onAppLeave = jest.fn(),
}: {
  hasESData?: boolean;
  hasUserDataView?: boolean;
  locationState?: MainHistoryLocationState;
  onAppLeave?: AppMountParameters['onAppLeave'];
} = {}) => {
  const props: MainRouteProps = {
    customizationCallbacks: [],
    customizationContext: mockCustomizationContext,
    onAppLeave,
  };

  renderWithI18n(
    <MemoryRouter>
      <DiscoverTestProvider services={getServicesMock(hasESData, hasUserDataView, locationState)}>
        <DiscoverMainRoute {...props} />
      </DiscoverTestProvider>
    </MemoryRouter>
  );
};

const waitForLoad = () => {
  return waitFor(() => expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument());
};

describe('DiscoverMainRoute', () => {
  beforeEach(() => {
    mockCustomizationService = Promise.resolve(createCustomizationService());
    mockRootProfileState = defaultRootProfileState;
    mockCreateRuntimeStateManager.mockReturnValue({
      adHocDataViews$: new BehaviorSubject<DataView[]>([]),
      tabs: { byId: {} },
    });
  });

  test('renders the main app when hasESData=true & hasUserDataView=true ', async () => {
    setupComponent({ hasESData: true, hasUserDataView: true });

    await waitForLoad();

    expect(screen.getByTestId('discover-main-app')).toBeVisible();
  });

  test('renders the main app when ad hoc data views exist', async () => {
    const defaultAdHocDataViews = [{ id: 'test', title: 'test' }];
    mockRootProfileState = {
      ...defaultRootProfileState,
      getDefaultAdHocDataViews: () => defaultAdHocDataViews,
    };

    setupComponent({ hasESData: true, hasUserDataView: false });

    await waitForLoad();

    expect(screen.getByTestId('discover-main-app')).toBeVisible();
  });

  test('renders the main app when a data view spec is passed through location state', async () => {
    setupComponent({
      hasESData: true,
      hasUserDataView: false,
      locationState: { dataViewSpec: { id: 'test', title: 'test' } },
    });

    await waitForLoad();

    expect(screen.getByTestId('discover-main-app')).toBeVisible();
  });

  test('renders no data page when hasESData=false & hasUserDataView=false', async () => {
    setupComponent({ hasESData: false, hasUserDataView: false });

    await waitForLoad();

    expect(screen.getByTestId('kbnNoDataPage')).toBeVisible();
  });

  test('renders no data view when hasESData=true & hasUserDataView=false', async () => {
    setupComponent({ hasESData: true, hasUserDataView: false });

    await waitForLoad();

    expect(screen.getByTestId('noDataViewsPrompt')).toBeVisible();
  });

  test('renders LoadingIndicator while customizations are loading', async () => {
    let resolveService = (_: DiscoverCustomizationService) => {};
    mockCustomizationService = new Promise((resolve) => {
      resolveService = resolve;
    });
    setupComponent({ hasESData: true, hasUserDataView: true });

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();

    resolveService(createCustomizationService());
    await waitForLoad();

    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
  });

  test('renders LoadingIndicator while root profile is loading', async () => {
    mockRootProfileState = { rootProfileLoading: true };

    setupComponent({ hasESData: true, hasUserDataView: true });

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  describe.each([
    { hasChanged: false, id: undefined, description: "hasn't changed and is not saved" },
    { hasChanged: true, id: undefined, description: 'has changed and is not saved' },
    { hasChanged: false, id: '1234', description: "hasn't changed and is saved" },
  ])('when $description', ({ hasChanged, id }) => {
    it('should call the default action', () => {
      // Given
      const discoverStateContainer = getDiscoverStateMock();
      discoverStateContainer.savedSearchState.getHasChanged$ = () =>
        new BehaviorSubject(hasChanged);
      discoverStateContainer.savedSearchState.getId = () => id;

      const tabMock = getTabRuntimeStateMock({
        stateContainer$: new BehaviorSubject<DiscoverStateContainer | undefined>(
          discoverStateContainer
        ),
      });

      mockCreateRuntimeStateManager.mockReturnValue(
        getRuntimeStateManagerMock({
          tabs: { byId: { 'tab-mock': tabMock } },
        })
      );

      const defaultFn = jest.fn();
      const onAppLeave = jest
        .fn()
        .mockImplementation((callback: (actions: AppLeaveActionFactory) => void) => {
          callback({
            default: defaultFn,
            confirm: jest.fn(),
          });
        });

      // When
      setupComponent({ onAppLeave });

      // Then
      expect(defaultFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('when there are unsaved changes', () => {
    it('should call the confirm action', () => {
      // Given
      const discoverStateContainer = getDiscoverStateMock();
      discoverStateContainer.savedSearchState.getHasChanged$ = () => new BehaviorSubject(true);
      discoverStateContainer.savedSearchState.getId = () => '1234';

      const tabMock = getTabRuntimeStateMock({
        stateContainer$: new BehaviorSubject<DiscoverStateContainer | undefined>(
          discoverStateContainer
        ),
      });

      mockCreateRuntimeStateManager.mockReturnValue(
        getRuntimeStateManagerMock({
          tabs: { byId: { 'tab-mock': tabMock } },
        })
      );

      const confirmFn = jest.fn();
      const onAppLeave = jest
        .fn()
        .mockImplementation((callback: (actions: AppLeaveActionFactory) => void) => {
          callback({
            default: jest.fn(),
            confirm: confirmFn,
          });
        });

      // When
      setupComponent({ onAppLeave });

      // Then
      expect(confirmFn).toHaveBeenCalledTimes(1);
    });
  });
});
