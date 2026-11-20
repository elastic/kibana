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
import { createMemoryHistory } from 'history';
import {
  createKbnUrlStateStorage,
  type IKbnUrlStateStorage,
} from '@kbn/kibana-utils-plugin/public';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { discoverServiceMock } from '../../__mocks__/services';
import type { MainRouteProps } from './discover_main_route';
import { DiscoverMainRoute } from './discover_main_route';
import * as resolveEsqlSourceModule from './data_fetching/resolve_esql_source';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import { EsqlSource } from '@kbn/data-source';
import type { DiscoverCustomizationService } from '../../customizations/customization_service';
import { createCustomizationService } from '../../customizations/customization_service';
import { mockCustomizationContext } from '../../customizations/__mocks__/customization_context';
import { APP_STATE_URL_KEY, type MainHistoryLocationState } from '../../../common';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { RootProfileState } from '../../context_awareness';
import { DiscoverTestProvider } from '../../__mocks__/test_provider';
import type { AppMountParameters } from '@kbn/core/public';
import { DATASETS_ROUTE } from '@kbn/esql-types';
import { clearESQLSourceInfoCache, ENABLE_ESQL } from '@kbn/esql-utils';
import { DEFAULT_ESQL_QUERY_SETTING } from '@kbn/discover-utils';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import { isOfAggregateQueryType, type AggregateQuery, type Query } from '@kbn/es-query';
import { DiscoverMainApp } from './components/single_tab_view/main_app';
import {
  internalStateActions,
  useAppStateSelector,
  useCurrentDataView,
  useCurrentTabAction,
  useCurrentTabSelector,
  useInternalStateDispatch,
} from './state_management/redux';

let mockCustomizationService: Promise<DiscoverCustomizationService> | undefined;

const dataViewListItem: DataViewListItem = {
  id: 'the-data-view-id',
  title: dataViewMock.getIndexPattern(),
  name: dataViewMock.name,
};

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
  hasESData: boolean | Promise<boolean> = true,
  hasDataView: boolean | Promise<boolean> = true,
  locationState?: MainHistoryLocationState,
  hasESQLDatasets: boolean | Promise<boolean> = false
) {
  const dataViewsMock = discoverServiceMock.data.dataViews;
  dataViewsMock.hasData = {
    hasESData: jest.fn(() => Promise.resolve(hasESData)),
    hasUserDataView: jest.fn(),
    hasDataView: jest.fn(() => Promise.resolve(hasDataView)),
  };
  dataViewsMock.getDefaultDataView = jest.fn(async () =>
    (await hasDataView) ? dataViewMock : null
  );
  dataViewsMock.getIdsWithTitle = jest.fn(async () =>
    (await hasDataView) ? [dataViewListItem] : []
  );
  dataViewsMock.create = jest.fn().mockResolvedValue(dataViewMock);
  discoverServiceMock.core.http.get = jest.fn().mockImplementation((path: string) => {
    if (path === DATASETS_ROUTE) {
      return Promise.resolve(hasESQLDatasets).then((hasDatasets) => ({
        datasets: hasDatasets
          ? [{ name: 'fds_dataset', data_source: 's3', resource: 'bucket' }]
          : [],
      }));
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
  stateStorageContainer,
  dataViewList,
  discoverSession,
}: {
  hasESData?: boolean | Promise<boolean>;
  hasDataView?: boolean | Promise<boolean>;
  locationState?: MainHistoryLocationState;
  onAppLeave?: AppMountParameters['onAppLeave'];
  hasESQLDatasets?: boolean | Promise<boolean>;
  stateStorageContainer?: IKbnUrlStateStorage;
  dataViewList?: Promise<DataViewListItem[]>;
  discoverSession?: DiscoverSession;
} = {}) => {
  const props: MainRouteProps = {
    customizationCallbacks: [],
    customizationContext: mockCustomizationContext,
    onAppLeave,
    stateStorageContainer,
  };
  const services = getServicesMock(hasESData, hasDataView, locationState, hasESQLDatasets);

  if (dataViewList) {
    services.dataViews.getIdsWithTitle = jest.fn(() => dataViewList);
  }

  if (discoverSession) {
    jest.mocked(services.discoverSessionService.get).mockResolvedValueOnce({
      session: discoverSession,
      warnings: [],
    });
  }

  const initialEntry = discoverSession ? `/view/${discoverSession.id}` : '/';

  renderWithI18n(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Route path={['/view/:id', '/']}>
        <DiscoverTestProvider services={services}>
          <DiscoverMainRoute {...props} />
        </DiscoverTestProvider>
      </Route>
    </MemoryRouter>
  );
};

const waitForLoad = () => {
  return waitFor(() => expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument());
};

const createUrlStateWithQuery = async (query: Query | AggregateQuery) => {
  const stateStorageContainer = createKbnUrlStateStorage({
    useHash: false,
    useHashQuery: true,
    history: createMemoryHistory(),
  });

  await stateStorageContainer.set(APP_STATE_URL_KEY, { query });

  return stateStorageContainer;
};

describe('DiscoverMainRoute', () => {
  beforeEach(() => {
    EsqlSource.clearCache();
    clearESQLSourceInfoCache();
    mockCustomizationService = Promise.resolve(createCustomizationService());
    mockRootProfileState = defaultRootProfileState;
    jest
      .mocked(DiscoverMainApp)
      .mockClear()
      .mockImplementation(() => <div data-test-subj="discover-main-app" />);
  });

  test('renders the main app when hasESData=true & hasDataView=true ', async () => {
    setupComponent({ hasESData: true, hasDataView: true });

    await waitForLoad();

    expect(screen.getByTestId('discover-main-app')).toBeVisible();
  });

  test('loads a Discover session when its URL is ambiguous', async () => {
    const services = getServicesMock();
    jest.spyOn(services.discoverSessionService, 'get').mockResolvedValueOnce({
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

    expect(services.discoverSessionService.get).toHaveBeenCalledWith('conflicting-session');
    expect(screen.queryByText('Cannot load this page')).not.toBeInTheDocument();
    expect(screen.getByTestId('discover-main-app')).toBeVisible();
  });

  test('redirects and warns when the requested Discover session does not exist', async () => {
    const id = 'missing-session';
    const services = getServicesMock();
    const replaceHistory = jest.spyOn(services.history, 'replace');
    jest
      .spyOn(services.discoverSessionService, 'get')
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

    expect(services.discoverSessionService.get).toHaveBeenCalledWith(id);
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

  test('renders the main app when hasESData=false & hasDataView=true', async () => {
    setupComponent({ hasESData: false, hasDataView: true });

    await waitForLoad();

    expect(screen.getByTestId('discover-main-app')).toBeVisible();
  });

  test.each<Query | AggregateQuery>([{ language: 'kuery', query: '' }, { esql: 'ROW value = 1' }])(
    'opens with query %j before the ES data check finishes when data views exist',
    async (query) => {
      const stateStorageContainer = await createUrlStateWithQuery(query);
      const esData = Promise.withResolvers<boolean>();

      setupComponent({ hasESData: esData.promise, stateStorageContainer });
      await waitForLoad();

      expect(screen.getByTestId('discover-main-app')).toBeVisible();

      await act(async () => {
        esData.resolve(false);
      });

      expect(screen.getByTestId('discover-main-app')).toBeVisible();
    }
  );

  test('opens an ES|QL tab when data view availability becomes true while the ES data check is pending', async () => {
    const stateStorageContainer = await createUrlStateWithQuery({ esql: 'ROW value = 1' });
    const esData = Promise.withResolvers<boolean>();
    const dataViews = Promise.withResolvers<boolean>();

    setupComponent({
      stateStorageContainer,
      hasESData: esData.promise,
      hasDataView: dataViews.promise,
    });

    await act(async () => {});

    expect(screen.getByLabelText('Loading')).toBeVisible();
    expect(DiscoverMainApp).not.toHaveBeenCalled();

    await act(async () => {
      dataViews.resolve(true);
    });

    const editor = await screen.findByTestId('discover-main-app');
    expect(editor).toBeVisible();

    await act(async () => {
      esData.resolve(false);
    });

    expect(screen.getByTestId('discover-main-app')).toBe(editor);
  });

  test('renders no data page when hasESData=false & hasDataView=false', async () => {
    const pendingCatalog = Promise.withResolvers<DataViewListItem[]>();

    setupComponent({ hasESData: false, hasDataView: false, dataViewList: pendingCatalog.promise });

    expect(await screen.findByTestId('kbnNoDataPage')).toBeVisible();
    expect(DiscoverMainApp).not.toHaveBeenCalled();
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

  test('opens an ES|QL query with only ES|QL datasets', async () => {
    const stateStorageContainer = await createUrlStateWithQuery({ esql: 'FROM fds_dataset' });

    setupComponent({
      hasESData: false,
      hasDataView: false,
      hasESQLDatasets: true,
      stateStorageContainer,
    });
    await waitForLoad();

    expect(screen.getByTestId('discover-main-app')).toBeVisible();
  });

  test('shows the data view prompt with only ES|QL datasets and no query or configured default', async () => {
    setupComponent({ hasESData: false, hasDataView: false, hasESQLDatasets: true });
    await waitForLoad();

    expect(screen.getByTestId('noDataViewsPrompt')).toBeVisible();
  });

  test.each<[string, boolean, boolean]>([
    ['profile', false, true],
    ['space', false, true],
    ['space', true, false],
  ])(
    'opens the %s default ES|QL query without data views (ES data: %s, ES|QL datasets: %s)',
    async (defaultQuerySource, hasESData, hasESQLDatasets) => {
      mockRootProfileState = {
        ...defaultRootProfileState,
        getDefaultEsqlQuery: () =>
          defaultQuerySource === 'profile' ? { query: 'FROM fds_dataset' } : undefined,
      };
      const getSettingMock = jest.mocked(discoverServiceMock.uiSettings.get);
      const getSetting = getSettingMock.getMockImplementation();
      const getIsEsqlDefaultMock = jest.mocked(
        discoverServiceMock.discoverFeatureFlags.getIsEsqlDefault
      );
      const getIsEsqlDefault = getIsEsqlDefaultMock.getMockImplementation();

      getSettingMock.mockImplementation((key, defaultOverride) => {
        if (key === ENABLE_ESQL) return true;
        if (key === DEFAULT_ESQL_QUERY_SETTING && defaultQuerySource === 'space') {
          return 'FROM fds_dataset';
        }
        return getSetting?.(key, defaultOverride);
      });
      getIsEsqlDefaultMock.mockImplementation(() => true);

      try {
        setupComponent({ hasESData, hasDataView: false, hasESQLDatasets });
        await waitForLoad();

        expect(screen.getByTestId('discover-main-app')).toBeVisible();
      } finally {
        getSettingMock.mockImplementation(getSetting);
        getIsEsqlDefaultMock.mockImplementation(getIsEsqlDefault);
      }
    }
  );

  test('opens an ES|QL tab while the data view list is still loading', async () => {
    const stateStorageContainer = await createUrlStateWithQuery({ esql: 'ROW value = 1' });
    const dataViewList = Promise.withResolvers<DataViewListItem[]>();

    setupComponent({ stateStorageContainer, dataViewList: dataViewList.promise });
    await waitForLoad();

    expect(screen.getByTestId('discover-main-app')).toBeVisible();
  });

  test('keeps the editor mounted and its draft when switching to classic while the catalog loads', async () => {
    const initialQuery = 'ROW value = 1';
    const draftQuery = 'ROW value = 2';
    const stateStorageContainer = await createUrlStateWithQuery({ esql: initialQuery });
    const catalog = Promise.withResolvers<DataViewListItem[]>();

    jest.mocked(DiscoverMainApp).mockImplementation(function StatefulApp() {
      const dispatch = useInternalStateDispatch();
      const transition = useCurrentTabAction(internalStateActions.transitionFromESQLToDataView);
      const dataView = useCurrentDataView();
      const query = useAppStateSelector((state) => state.query);
      const mode = isOfAggregateQueryType(query) ? 'ES|QL' : 'Classic';
      const isLoading = useCurrentTabSelector((tab) => tab.isDataViewLoading);

      return (
        <div data-test-subj="discover-main-app">
          <input aria-label="Draft query" defaultValue={initialQuery} />
          <button onClick={() => dispatch(transition({ dataView }))}>Switch to Classic</button>
          <output>{mode}</output>
          <output>{isLoading ? 'Switching' : 'Ready'}</output>
        </div>
      );
    });

    setupComponent({ stateStorageContainer, dataViewList: catalog.promise });

    const draft = await screen.findByRole('textbox', { name: 'Draft query' });
    fireEvent.change(draft, { target: { value: draftQuery } });
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Classic' }));

    await act(async () => {});

    expect(screen.getByText('ES|QL')).toBeVisible();
    expect(screen.getByText('Switching')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Draft query' })).toBe(draft);
    expect(draft).toHaveValue(draftQuery);

    await act(async () => {
      catalog.resolve([dataViewListItem]);
    });

    expect(await screen.findByText('Classic')).toBeVisible();
    expect(screen.getByText('Ready')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Draft query' })).toBe(draft);
    expect(draft).toHaveValue(draftQuery);
  });

  test('hides the tabs bar when the selected tab needs a data view in a session with multiple tabs', async () => {
    const dataViews = Promise.withResolvers<boolean>();
    const discoverSession = createDiscoverSessionMock({
      id: 'multiple-tabs',
      tabs: ['first-tab', 'second-tab'].map((id) => ({
        id,
        label: id,
        sort: [],
        columns: [],
        grid: {},
        hideChart: false,
        hideTable: false,
        isTextBasedQuery: false,
        serializedSearchSource: { query: { language: 'kuery', query: '' } },
      })),
    });

    setupComponent({ discoverSession, hasESData: true, hasDataView: dataViews.promise });

    expect(await screen.findByTestId('unifiedTabs_tabsBar')).toBeVisible();
    expect(screen.getAllByRole('tab')).toHaveLength(2);

    await act(async () => {
      dataViews.resolve(false);
    });

    expect(await screen.findByTestId('noDataViewsPrompt')).toBeVisible();
    expect(screen.queryByTestId('unifiedTabs_tabsBar')).not.toBeInTheDocument();
    expect(DiscoverMainApp).not.toHaveBeenCalled();
  });

  test.each(['FROM logs-*', 'ROW value = 1'])(
    'opens ES|QL query %s without waiting for data view availability or the catalog',
    async (esql) => {
      const stateStorageContainer = await createUrlStateWithQuery({ esql });
      const dataViews = Promise.withResolvers<boolean>();
      const catalog = Promise.withResolvers<DataViewListItem[]>();

      setupComponent({
        stateStorageContainer,
        hasESData: true,
        hasDataView: dataViews.promise,
        dataViewList: catalog.promise,
      });

      const editor = await screen.findByTestId('discover-main-app');
      expect(editor).toBeVisible();

      await act(async () => {
        dataViews.resolve(false);
      });

      expect(screen.getByTestId('discover-main-app')).toBe(editor);
      expect(screen.queryByTestId('kbnNoDataPage')).not.toBeInTheDocument();
    }
  );

  test.each(['FROM logs-*', 'ROW value = 1'])(
    'shows the no-data page without resolving the schema when delayed checks find nothing for %s',
    async (esql) => {
      const stateStorageContainer = await createUrlStateWithQuery({ esql });
      const availability = Promise.withResolvers<boolean>();
      const resolveSpy = jest.spyOn(resolveEsqlSourceModule, 'resolveEsqlSource');

      try {
        setupComponent({
          stateStorageContainer,
          hasESData: availability.promise,
          hasDataView: availability.promise,
          hasESQLDatasets: availability.promise,
        });

        await act(async () => {});

        expect(screen.getByLabelText('Loading')).toBeVisible();
        expect(DiscoverMainApp).not.toHaveBeenCalled();
        expect(resolveSpy).not.toHaveBeenCalled();
        expect(screen.queryByTestId('kbnNoDataPage')).not.toBeInTheDocument();

        await act(async () => {
          availability.resolve(false);
        });

        expect(await screen.findByTestId('kbnNoDataPage')).toBeVisible();
        expect(DiscoverMainApp).not.toHaveBeenCalled();
        expect(resolveSpy).not.toHaveBeenCalled();
      } finally {
        resolveSpy.mockRestore();
      }
    }
  );

  test.each<Query | AggregateQuery>([{ language: 'kuery', query: '' }, { esql: '' }])(
    'waits for data view availability before opening query %j even if the catalog is ready',
    async (query) => {
      const stateStorageContainer = await createUrlStateWithQuery(query);
      const dataViews = Promise.withResolvers<boolean>();

      setupComponent({
        stateStorageContainer,
        hasDataView: dataViews.promise,
        dataViewList: Promise.resolve([dataViewListItem]),
      });

      await act(async () => {});

      expect(screen.getByLabelText('Loading')).toBeVisible();
      expect(screen.queryByTestId('noDataViewsPrompt')).not.toBeInTheDocument();
      expect(screen.queryByTestId('discover-main-app')).not.toBeInTheDocument();

      await act(async () => {
        dataViews.resolve(true);
      });

      expect(await screen.findByTestId('discover-main-app')).toBeVisible();
      expect(discoverServiceMock.dataViews.hasData.hasDataView).toHaveBeenCalledTimes(1);
    }
  );

  test('waits for the data view list before opening a classic tab', async () => {
    const stateStorageContainer = await createUrlStateWithQuery({
      language: 'kuery',
      query: '',
    });
    const dataViewList = Promise.withResolvers<DataViewListItem[]>();

    setupComponent({ stateStorageContainer, dataViewList: dataViewList.promise });
    await act(async () => {});

    expect(screen.queryByTestId('discover-main-app')).not.toBeInTheDocument();

    await act(async () => {
      dataViewList.resolve([dataViewListItem]);
    });
    await waitForLoad();

    expect(screen.getByTestId('discover-main-app')).toBeVisible();
  });

  test('renders no data view when hasESData=true & hasDataView=false', async () => {
    const pendingCatalog = Promise.withResolvers<DataViewListItem[]>();

    setupComponent({ hasESData: true, hasDataView: false, dataViewList: pendingCatalog.promise });

    expect(await screen.findByTestId('noDataViewsPrompt')).toBeVisible();
    expect(DiscoverMainApp).not.toHaveBeenCalled();
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

    await act(async () => {
      setupComponent({ hasESData: true, hasDataView: true });
    });

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });
});
