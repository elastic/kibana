/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen, waitFor } from '@testing-library/react';
import { discoverServiceMock } from '../../__mocks__/services';
import type { MainRouteProps } from './discover_main_route';
import { DiscoverMainRoute } from './discover_main_route';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import type { DiscoverCustomizationService } from '../../customizations/customization_service';
import { createCustomizationService } from '../../customizations/customization_service';
import { mockCustomizationContext } from '../../customizations/__mocks__/customization_context';
import type { MainHistoryLocationState } from '../../../common';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { RootProfileState } from '../../context_awareness';
import { DiscoverTestProvider } from '../../__mocks__/test_provider';
import type { AppMountParameters } from '@kbn/core/public';
import { DATASETS_ROUTE } from '@kbn/esql-types';

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
  getDefaultAdHocDataViews: () => [],
  getDefaultEsqlQuery: () => undefined,
};
let mockRootProfileState: RootProfileState = defaultRootProfileState;

jest.mock('../../context_awareness/hooks/use_root_profile', () => ({
  useRootProfile: () => mockRootProfileState,
}));

function getServicesMock(
  hasESData = true,
  hasDataView = true,
  locationState?: MainHistoryLocationState,
  hasESQLDatasets = false
) {
  const dataViewsMock = discoverServiceMock.data.dataViews;
  dataViewsMock.hasData = {
    hasESData: jest.fn(() => Promise.resolve(hasESData)),
    hasUserDataView: jest.fn(),
    hasDataView: jest.fn(() => Promise.resolve(hasDataView)),
  };
  dataViewsMock.create = jest.fn().mockResolvedValue(dataViewMock);
  discoverServiceMock.core.http.get = jest.fn().mockImplementation((path: string) => {
    if (path === DATASETS_ROUTE) {
      return Promise.resolve({
        datasets: hasESQLDatasets
          ? [{ name: 'fds_dataset', data_source: 's3', resource: 'bucket' }]
          : [],
      });
    }
    return Promise.resolve({});
  });
  discoverServiceMock.getScopedHistory = jest.fn().mockReturnValue({
    location: {
      state: locationState,
    },
    replace: jest.fn(),
  });
  return discoverServiceMock;
}

const setupComponent = ({
  hasESData = true,
  hasDataView = true,
  locationState,
  onAppLeave = jest.fn(),
  hasESQLDatasets = false,
}: {
  hasESData?: boolean;
  hasDataView?: boolean;
  locationState?: MainHistoryLocationState;
  onAppLeave?: AppMountParameters['onAppLeave'];
  hasESQLDatasets?: boolean;
} = {}) => {
  const props: MainRouteProps = {
    customizationCallbacks: [],
    customizationContext: mockCustomizationContext,
    onAppLeave,
  };

  renderWithI18n(
    <MemoryRouter>
      <DiscoverTestProvider
        services={getServicesMock(hasESData, hasDataView, locationState, hasESQLDatasets)}
      >
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
  });

  test('renders the main app when hasESData=true & hasDataView=true ', async () => {
    setupComponent({ hasESData: true, hasDataView: true });

    await waitForLoad();

    expect(screen.getByTestId('discover-main-app')).toBeVisible();
  });

  test('loads a Discover session when its URL is ambiguous', async () => {
    const services = getServicesMock();
    jest.spyOn(services.sessionService, 'get').mockResolvedValueOnce({
      session: createDiscoverSessionMock({
        id: 'conflicting-session',
        sharingSavedObjectProps: {
          outcome: 'conflict',
          aliasTargetId: 'other-session',
          aliasPurpose: 'savedObjectConversion',
        },
      }),
      warnings: [],
    });
    const props: MainRouteProps = {
      customizationCallbacks: [],
      customizationContext: mockCustomizationContext,
      onAppLeave: jest.fn(),
    };

    renderWithI18n(
      <MemoryRouter initialEntries={['/view/conflicting-session']}>
        <Route path="/view/:id">
          <DiscoverTestProvider services={services}>
            <DiscoverMainRoute {...props} />
          </DiscoverTestProvider>
        </Route>
      </MemoryRouter>
    );

    await waitForLoad();

    expect(services.sessionService.get).toHaveBeenCalledWith('conflicting-session');
    expect(screen.queryByText('Cannot load this page')).not.toBeInTheDocument();
    expect(screen.getByTestId('discover-main-app')).toBeVisible();
  });

  test('redirects and warns when the requested Discover session does not exist', async () => {
    const id = 'missing-session';
    const services = getServicesMock();
    const replaceHistory = jest.spyOn(services.history, 'replace');
    jest
      .spyOn(services.sessionService, 'get')
      .mockRejectedValueOnce(new SavedObjectNotFound({ type: 'search', id }));
    const props: MainRouteProps = {
      customizationCallbacks: [],
      customizationContext: mockCustomizationContext,
      onAppLeave: jest.fn(),
    };

    renderWithI18n(
      <MemoryRouter initialEntries={[`/view/${id}`]}>
        <Route path="/view/:id">
          <DiscoverTestProvider services={services}>
            <DiscoverMainRoute {...props} />
          </DiscoverTestProvider>
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(services.toastNotifications.addWarning).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Saved object is missing',
          text: expect.any(Function),
        })
      );
    });

    expect(services.sessionService.get).toHaveBeenCalledWith(id);
    expect(services.urlTracker.setTrackedUrl).toHaveBeenCalledWith('/');
    expect(replaceHistory).toHaveBeenCalledWith(
      `/?notFound=search&notFoundMessage=Could not locate that search (id: ${id})`
    );
    expect(screen.queryByText('Cannot load this page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('discover-main-app')).not.toBeInTheDocument();
  });

  test('renders the main app when ad hoc data views exist', async () => {
    const defaultAdHocDataViews = [{ id: 'test', title: 'test' }];
    mockRootProfileState = {
      ...defaultRootProfileState,
      getDefaultAdHocDataViews: () => defaultAdHocDataViews,
    };

    setupComponent({ hasESData: true, hasDataView: false });

    await waitForLoad();

    expect(screen.getByTestId('discover-main-app')).toBeVisible();
  });

  test('renders the main app when a data view spec is passed through location state', async () => {
    setupComponent({
      hasESData: true,
      hasDataView: false,
      locationState: { dataViewSpec: { id: 'test', title: 'test' } },
    });

    await waitForLoad();

    expect(screen.getByTestId('discover-main-app')).toBeVisible();
  });

  test('renders no data page when hasESData=false & hasDataView=false', async () => {
    setupComponent({ hasESData: false, hasDataView: false });

    await waitForLoad();

    expect(screen.getByTestId('kbnNoDataPage')).toBeVisible();
  });

  test('renders no data page when a root profile contributes an ad hoc data view but there is no ES data', async () => {
    const defaultAdHocDataViews = [{ id: 'example-profile-data-view', title: 'my-example-*' }];
    mockRootProfileState = {
      ...defaultRootProfileState,
      getDefaultAdHocDataViews: () => defaultAdHocDataViews,
    };

    setupComponent({ hasESData: false, hasDataView: false });

    await waitForLoad();

    // The profile contributed its ad hoc data view on this render.
    expect(discoverServiceMock.data.dataViews.create).toHaveBeenCalledWith(
      { ...defaultAdHocDataViews[0], managed: true },
      true
    );

    // A profile-contributed data view stands in for a missing user data view (see the test above),
    // but it must not stand in for missing data: over an empty deployment it would only ever return
    // nothing, so onboarding still has to win.
    expect(screen.getByTestId('kbnNoDataPage')).toBeVisible();
  });

  test('renders the main app when ES|QL datasets exist but no local ES data or data view', async () => {
    setupComponent({ hasESData: false, hasDataView: false, hasESQLDatasets: true });

    await waitForLoad();

    expect(screen.getByTestId('discover-main-app')).toBeVisible();
  });

  test('renders no data view when hasESData=true & hasDataView=false', async () => {
    setupComponent({ hasESData: true, hasDataView: false });

    await waitForLoad();

    expect(screen.getByTestId('noDataViewsPrompt')).toBeVisible();
  });

  test('renders LoadingIndicator while customizations are loading', async () => {
    let resolveService = (_: DiscoverCustomizationService) => {};
    mockCustomizationService = new Promise((resolve) => {
      resolveService = resolve;
    });
    setupComponent({ hasESData: true, hasDataView: true });

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();

    resolveService(createCustomizationService());
    await waitForLoad();

    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
  });

  test('renders LoadingIndicator while root profile is loading', async () => {
    mockRootProfileState = { rootProfileLoading: true };

    setupComponent({ hasESData: true, hasDataView: true });

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });
});
