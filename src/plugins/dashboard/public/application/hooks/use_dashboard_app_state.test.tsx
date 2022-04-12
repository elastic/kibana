/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { of } from 'rxjs';
import { Provider } from 'react-redux';
import { createBrowserHistory } from 'history';
import { renderHook, act, RenderHookResult } from '@testing-library/react-hooks';

import { DashboardSessionStorage } from '../lib';
import { coreMock } from '../../../../../core/public/mocks';
import { DashboardConstants } from '../../dashboard_constants';
import { dataPluginMock } from '../../../../data/public/mocks';
import { SavedObjectLoader } from '../../services/saved_objects';
import { DashboardAppServices, DashboardAppState } from '../../types';
import { DashboardContainer } from '../embeddable/dashboard_container';
import { KibanaContextProvider } from '../../../../kibana_react/public';
import { EmbeddableFactory, ViewMode } from '../../services/embeddable';
import { dashboardStateStore, setDescription, setViewMode } from '../state';
import { DashboardContainerServices } from '../embeddable/dashboard_container';
import { createKbnUrlStateStorage, defer } from '../../../../kibana_utils/public';
import { useDashboardAppState, UseDashboardStateProps } from './use_dashboard_app_state';
import {
  getSampleDashboardInput,
  getSavedDashboardMock,
  makeDefaultServices,
} from '../test_helpers';
import { DataViewsContract } from '../../services/data';
import { DataView } from '../../services/data_views';
import type { Filter } from '@kbn/es-query';

interface SetupEmbeddableFactoryReturn {
  finalizeEmbeddableCreation: () => void;
  dashboardContainer: DashboardContainer;
  dashboardDestroySpy: jest.SpyInstance<unknown>;
}

interface RenderDashboardStateHookReturn {
  embeddableFactoryResult: SetupEmbeddableFactoryReturn;
  renderHookResult: RenderHookResult<Partial<UseDashboardStateProps>, DashboardAppState>;
  services: DashboardAppServices;
  props: UseDashboardStateProps;
}

const originalDashboardEmbeddableId = 'originalDashboardEmbeddableId';

const createDashboardAppStateProps = (): UseDashboardStateProps => ({
  kbnUrlStateStorage: createKbnUrlStateStorage(),
  savedDashboardId: 'testDashboardId',
  history: createBrowserHistory(),
  isEmbeddedExternally: false,
});

const createDashboardAppStateServices = () => {
  const defaults = makeDefaultServices();
  const dataViews = {} as DataViewsContract;
  const defaultDataView = { id: 'foo', fields: [{ name: 'bar' }] } as DataView;
  dataViews.ensureDefaultDataView = jest.fn().mockImplementation(() => Promise.resolve(true));
  dataViews.getDefault = jest.fn().mockImplementation(() => Promise.resolve(defaultDataView));

  const data = dataPluginMock.createStartContract();
  data.query.filterManager.getUpdates$ = jest.fn().mockImplementation(() => of(void 0));
  data.query.queryString.getUpdates$ = jest.fn().mockImplementation(() => of({}));
  data.query.timefilter.timefilter.getTimeUpdate$ = jest.fn().mockImplementation(() => of(void 0));
  data.query.timefilter.timefilter.getRefreshIntervalUpdate$ = jest
    .fn()
    .mockImplementation(() => of(void 0));

  return { ...defaults, dataViews, data };
};

const setupEmbeddableFactory = (
  services: DashboardAppServices,
  id: string
): SetupEmbeddableFactoryReturn => {
  const coreStart = coreMock.createStart();
  const containerOptions = {
    notifications: services.core.notifications,
    savedObjectMetaData: {} as unknown,
    ExitFullScreenButton: () => null,
    embeddable: services.embeddable,
    uiSettings: services.uiSettings,
    SavedObjectFinder: () => null,
    overlays: coreStart.overlays,
    application: {} as unknown,
    inspector: {} as unknown,
    uiActions: {} as unknown,
    http: coreStart.http,
  } as unknown as DashboardContainerServices;

  const dashboardContainer = new DashboardContainer(
    { ...getSampleDashboardInput(), id },
    containerOptions
  );
  const deferEmbeddableCreate = defer();
  services.embeddable.getEmbeddableFactory = jest.fn().mockImplementation(
    () =>
      ({
        create: () => deferEmbeddableCreate.promise,
      } as unknown as EmbeddableFactory)
  );
  const dashboardDestroySpy = jest.spyOn(dashboardContainer, 'destroy');

  return {
    dashboardContainer,
    dashboardDestroySpy,
    finalizeEmbeddableCreation: () => {
      act(() => {
        deferEmbeddableCreate.resolve(dashboardContainer);
      });
    },
  };
};

const renderDashboardAppStateHook = ({
  partialProps,
  partialServices,
}: {
  partialProps?: Partial<UseDashboardStateProps>;
  partialServices?: Partial<DashboardAppServices>;
}): RenderDashboardStateHookReturn => {
  const props = { ...createDashboardAppStateProps(), ...(partialProps ?? {}) };
  const services = { ...createDashboardAppStateServices(), ...(partialServices ?? {}) };
  const embeddableFactoryResult = setupEmbeddableFactory(services, originalDashboardEmbeddableId);
  const renderHookResult = renderHook(
    (replaceProps: Partial<UseDashboardStateProps>) =>
      useDashboardAppState({ ...props, ...replaceProps }),
    {
      wrapper: ({ children }) => (
        <Provider store={dashboardStateStore}>
          <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
        </Provider>
      ),
    }
  );
  return { embeddableFactoryResult, renderHookResult, services, props };
};

describe('Dashboard container lifecycle', () => {
  test('Dashboard container is destroyed on unmount', async () => {
    const { renderHookResult, embeddableFactoryResult } = renderDashboardAppStateHook({});
    embeddableFactoryResult.finalizeEmbeddableCreation();
    await renderHookResult.waitForNextUpdate();

    expect(embeddableFactoryResult.dashboardContainer).toBe(
      renderHookResult.result.current.dashboardContainer
    );
    expect(embeddableFactoryResult.dashboardDestroySpy).not.toBeCalled();
    renderHookResult.unmount();
    expect(embeddableFactoryResult.dashboardDestroySpy).toBeCalled();
  });

  test('Old dashboard container is destroyed when new dashboardId is given', async () => {
    const { renderHookResult, embeddableFactoryResult, services } = renderDashboardAppStateHook({});
    const getResult = () => renderHookResult.result.current;

    // on initial render dashboard container is undefined
    expect(getResult().dashboardContainer).toBeUndefined();
    embeddableFactoryResult.finalizeEmbeddableCreation();

    await renderHookResult.waitForNextUpdate();
    expect(embeddableFactoryResult.dashboardContainer).toBe(getResult().dashboardContainer);
    expect(embeddableFactoryResult.dashboardDestroySpy).not.toBeCalled();

    const newDashboardId = 'wow_a_new_dashboard_id';
    const embeddableFactoryNew = setupEmbeddableFactory(services, newDashboardId);
    renderHookResult.rerender({ savedDashboardId: newDashboardId });

    embeddableFactoryNew.finalizeEmbeddableCreation();
    await renderHookResult.waitForNextUpdate();

    expect(embeddableFactoryNew.dashboardContainer).toEqual(getResult().dashboardContainer);
    expect(embeddableFactoryNew.dashboardDestroySpy).not.toBeCalled();
    expect(embeddableFactoryResult.dashboardDestroySpy).toBeCalled();
  });

  test('Dashboard container is destroyed if dashboard id is changed before container is resolved', async () => {
    const { renderHookResult, embeddableFactoryResult, services } = renderDashboardAppStateHook({});
    const getResult = () => renderHookResult.result.current;

    // on initial render dashboard container is undefined
    expect(getResult().dashboardContainer).toBeUndefined();
    await act(() => Promise.resolve()); // wait for the original savedDashboard to be loaded...

    const newDashboardId = 'wow_a_new_dashboard_id';
    const embeddableFactoryNew = setupEmbeddableFactory(services, newDashboardId);

    renderHookResult.rerender({ savedDashboardId: newDashboardId });
    await act(() => Promise.resolve()); // wait for the new savedDashboard to be loaded...
    embeddableFactoryNew.finalizeEmbeddableCreation();
    await renderHookResult.waitForNextUpdate();
    expect(embeddableFactoryNew.dashboardContainer).toBe(getResult().dashboardContainer);
    expect(embeddableFactoryNew.dashboardDestroySpy).not.toBeCalled();

    embeddableFactoryResult.finalizeEmbeddableCreation();
    await act(() => Promise.resolve()); // Can't use waitFor from hooks, because there is no hook update
    expect(embeddableFactoryNew.dashboardContainer).toBe(getResult().dashboardContainer);
    expect(embeddableFactoryNew.dashboardDestroySpy).not.toBeCalled();
    expect(embeddableFactoryResult.dashboardDestroySpy).toBeCalled();
  });
});

// FLAKY: https://github.com/elastic/kibana/issues/116050
// FLAKY: https://github.com/elastic/kibana/issues/105018
describe.skip('Dashboard initial state', () => {
  it('Extracts state from Dashboard Saved Object', async () => {
    const { renderHookResult, embeddableFactoryResult } = renderDashboardAppStateHook({});
    const getResult = () => renderHookResult.result.current;

    // saved dashboard isn't applied until after the dashboard embeddable has been created.
    expect(getResult().savedDashboard).toBeUndefined();

    embeddableFactoryResult.finalizeEmbeddableCreation();
    await renderHookResult.waitForNextUpdate();

    expect(getResult().savedDashboard).toBeDefined();
    expect(getResult().savedDashboard?.title).toEqual(
      getResult().getLatestDashboardState?.().title
    );
  });

  it('Sets initial time range and filters from saved dashboard', async () => {
    const savedDashboards = {} as SavedObjectLoader;
    savedDashboards.get = jest.fn().mockImplementation((id?: string) =>
      Promise.resolve(
        getSavedDashboardMock({
          getFilters: () => [{ meta: { test: 'filterMeTimbers' } } as unknown as Filter],
          timeRestore: true,
          timeFrom: 'now-13d',
          timeTo: 'now',
          id,
        })
      )
    );
    const partialServices: Partial<DashboardAppServices> = { savedDashboards };
    const { renderHookResult, embeddableFactoryResult, services } = renderDashboardAppStateHook({
      partialServices,
    });
    const getResult = () => renderHookResult.result.current;

    embeddableFactoryResult.finalizeEmbeddableCreation();
    await renderHookResult.waitForNextUpdate();

    expect(getResult().getLatestDashboardState?.().timeRestore).toEqual(true);
    expect(services.data.query.timefilter.timefilter.setTime).toHaveBeenCalledWith({
      from: 'now-13d',
      to: 'now',
    });
    expect(services.data.query.filterManager.setAppFilters).toHaveBeenCalledWith([
      { meta: { test: 'filterMeTimbers' } } as unknown as Filter,
    ]);
  });

  it('Combines session state and URL state into initial state', async () => {
    const dashboardSessionStorage = {
      getState: jest
        .fn()
        .mockReturnValue({ viewMode: ViewMode.EDIT, description: 'this should be overwritten' }),
    } as unknown as DashboardSessionStorage;
    const kbnUrlStateStorage = createKbnUrlStateStorage();
    kbnUrlStateStorage.set('_a', { description: 'with this' });
    const { renderHookResult, embeddableFactoryResult } = renderDashboardAppStateHook({
      partialProps: { kbnUrlStateStorage },
      partialServices: { dashboardSessionStorage },
    });
    const getResult = () => renderHookResult.result.current;

    embeddableFactoryResult.finalizeEmbeddableCreation();
    await renderHookResult.waitForNextUpdate();
    expect(getResult().getLatestDashboardState?.().description).toEqual('with this');
    expect(getResult().getLatestDashboardState?.().viewMode).toEqual(ViewMode.EDIT);
  });
});

// FLAKY: https://github.com/elastic/kibana/issues/116043
describe.skip('Dashboard state sync', () => {
  let defaultDashboardAppStateHookResult: RenderDashboardStateHookReturn;
  const getResult = () => defaultDashboardAppStateHookResult.renderHookResult.result.current;

  beforeEach(async () => {
    DashboardConstants.CHANGE_APPLY_DEBOUNCE = 0;
    DashboardConstants.CHANGE_CHECK_DEBOUNCE = 0;
    defaultDashboardAppStateHookResult = renderDashboardAppStateHook({});
    defaultDashboardAppStateHookResult.embeddableFactoryResult.finalizeEmbeddableCreation();
    await defaultDashboardAppStateHookResult.renderHookResult.waitForNextUpdate();
  });

  it('Updates Dashboard container input when state changes', async () => {
    const { embeddableFactoryResult } = defaultDashboardAppStateHookResult;
    embeddableFactoryResult.dashboardContainer.updateInput = jest.fn();
    act(() => {
      dashboardStateStore.dispatch(setDescription('Well hello there new description'));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3)); // So that $triggerDashboardRefresh.next is called
    });
    expect(embeddableFactoryResult.dashboardContainer.updateInput).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Well hello there new description' })
    );
  });

  it('Updates state when dashboard container input changes', async () => {
    const { embeddableFactoryResult } = defaultDashboardAppStateHookResult;
    expect(getResult().getLatestDashboardState?.().fullScreenMode).toBe(false);
    act(() => {
      embeddableFactoryResult.dashboardContainer.updateInput({
        isFullScreenMode: true,
      });
    });
    await act(() => Promise.resolve());
    expect(getResult().getLatestDashboardState?.().fullScreenMode).toBe(true);
  });

  it('pushes unsaved changes to the session storage', async () => {
    const { services } = defaultDashboardAppStateHookResult;
    expect(getResult().getLatestDashboardState?.().fullScreenMode).toBe(false);
    act(() => {
      dashboardStateStore.dispatch(setViewMode(ViewMode.EDIT)); // session storage is only populated in edit mode
      dashboardStateStore.dispatch(setDescription('Wow an even cooler description.'));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3));
    });
    expect(services.dashboardSessionStorage.setState).toHaveBeenCalledWith(
      'testDashboardId',
      expect.objectContaining({
        description: 'Wow an even cooler description.',
        viewMode: ViewMode.EDIT,
      })
    );
  });
});
