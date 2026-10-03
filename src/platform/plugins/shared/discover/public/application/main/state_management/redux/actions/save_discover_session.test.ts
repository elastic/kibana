/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { fromTabStateToSavedObjectTab } from '../tab_mapping_utils';
import { getTabStateMock } from '../__mocks__/internal_state.mocks';
import { dataViewMock, dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import type { DiscoverServices } from '../../../../../build_services';
import type { SaveDiscoverSessionParams } from '@kbn/saved-search-plugin/public';
import { internalStateActions, selectHasUnsavedChanges } from '..';
import { createDiscoverSessionService, type DiscoverSessionClient } from '../../../../../session';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { internalStateSlice } from '../internal_state';
import type { SaveDiscoverSessionThunkParams } from './save_discover_session';
import * as tabStateDataViewActions from './tab_state_data_view';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { getPersistedTabMock } from '../__mocks__/internal_state.mocks';
import { generateInlineDataViewId } from '../../../../../../common/session/inline_data_view';
import { BooleanRelation, buildCombinedFilter, FilterStateStore } from '@kbn/es-query';
import { createFilter } from '../../../../../../common/session/inline_data_view.fixtures';

const getSaveDiscoverSessionParams = (
  overrides: Partial<SaveDiscoverSessionThunkParams> = {}
): SaveDiscoverSessionThunkParams => ({
  newTitle: 'new title',
  newCopyOnSave: false,
  newTimeRestore: false,
  newDescription: 'new description',
  newTags: [],
  ...overrides,
});

const setup = async ({
  additionalPersistedTabs,
  initializeTab = false,
}: {
  additionalPersistedTabs?: (services: DiscoverServices) => DiscoverSessionTab[];
  initializeTab?: boolean;
} = {}) => {
  const services = createDiscoverServicesMock();
  const saveDiscoverSessionSpy = jest
    .spyOn(services.discoverSessionService, 'save')
    .mockImplementation((discoverSession, { copyOnSave }) =>
      Promise.resolve({
        ...discoverSession,
        id: copyOnSave ? 'copied-session' : discoverSession.id ?? 'new-session',
        managed: false,
      })
    );
  const dataViewCreateSpy = jest.spyOn(services.dataViews, 'create');
  const dataViewsClearCacheSpy = jest.spyOn(services.dataViews, 'clearInstanceCache');

  const toolkit = getDiscoverInternalStateMock({
    services,
    persistedDataViews: [dataViewMock, dataViewMockWithTimeField],
  });

  const defaultTab = getPersistedTabMock({
    tabId: 'default-tab',
    dataView: dataViewMock,
    services,
  });

  const tabs = [defaultTab, ...(additionalPersistedTabs?.(services) ?? [])];

  await toolkit.initializeTabs({
    persistedDiscoverSession: createDiscoverSessionMock({
      id: 'test-session',
      title: 'Test Session',
      description: 'Test Description',
      tabs,
    }),
  });

  if (initializeTab) {
    await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });
  }

  return {
    toolkit,
    services,
    saveDiscoverSessionSpy,
    dataViewCreateSpy,
    dataViewsClearCacheSpy,
  };
};

describe('saveDiscoverSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call saveDiscoverSession with the expected params', async () => {
    const { toolkit, saveDiscoverSessionSpy } = await setup({
      additionalPersistedTabs: (services) => [
        getPersistedTabMock({
          tabId: 'test-tab',
          dataView: dataViewMock,
          services,
        }),
      ],
    });
    const discoverSession = toolkit.internalState.getState().persistedDiscoverSession;

    await toolkit.internalState.dispatch(
      internalStateActions.saveDiscoverSession(
        getSaveDiscoverSessionParams({ newTags: ['tag1', 'tag2'] })
      )
    );

    const updatedDiscoverSession: SaveDiscoverSessionParams = {
      id: discoverSession?.id,
      title: 'new title',
      description: 'new description',
      tabs: discoverSession?.tabs ?? [],
      tags: ['tag1', 'tag2'],
    };

    expect(saveDiscoverSessionSpy).toHaveBeenCalledWith(updatedDiscoverSession, {
      copyOnSave: false,
    });

    expect(toolkit.internalState.getState().persistedDiscoverSession).toEqual({
      ...updatedDiscoverSession,
      managed: false,
    });
  });

  it('should update runtime state for applicable tabs', async () => {
    const { toolkit, services, saveDiscoverSessionSpy } = await setup({ initializeTab: true });

    const currentTabId = toolkit.getCurrentTab().id;
    toolkit.internalState.dispatch(
      internalStateActions.updateAppState({
        tabId: currentTabId,
        appState: {
          breakdownField: 'breakdown-test',
        },
      })
    );

    const resetOnSavedSearchChangeSpy = jest.spyOn(
      internalStateSlice.actions,
      'resetOnSavedSearchChange'
    );
    const setDataViewSpy = jest.spyOn(tabStateDataViewActions, 'setDataView');

    jest
      .spyOn(services.data.search.searchSource, 'create')
      .mockResolvedValue(createSearchSourceMock({ index: dataViewMockWithTimeField }));

    await toolkit.internalState.dispatch(
      internalStateActions.saveDiscoverSession(getSaveDiscoverSessionParams())
    );

    expect(saveDiscoverSessionSpy).toHaveBeenCalled();
    expect(resetOnSavedSearchChangeSpy).toHaveBeenCalledWith({ tabId: currentTabId });
    expect(setDataViewSpy).toHaveBeenCalledWith({
      tabId: currentTabId,
      dataView: dataViewMockWithTimeField,
    });
    expect(toolkit.getCurrentTab().appState.breakdownField).toBe('breakdown-test');
  });

  it('should preserve current sidebar state for initialized tabs', async () => {
    const { toolkit, saveDiscoverSessionSpy } = await setup({ initializeTab: true });
    const currentTabId = toolkit.getCurrentTab().id;

    toolkit.internalState.dispatch(
      internalStateActions.updateAppState({
        tabId: currentTabId,
        appState: {
          hideSidebar: true,
        },
      })
    );

    await toolkit.internalState.dispatch(
      internalStateActions.saveDiscoverSession(getSaveDiscoverSessionParams())
    );

    expect(saveDiscoverSessionSpy).toHaveBeenCalled();

    const savedTab = saveDiscoverSessionSpy.mock.calls[0][0].tabs.find(
      (tab) => tab.id === currentTabId
    );

    expect(savedTab).not.toHaveProperty('hideSidebar');
    expect(toolkit.getCurrentTab().appState.hideSidebar).toBe(true);
  });

  it('should not update local state if saveDiscoverSession returns undefined', async () => {
    const { toolkit, saveDiscoverSessionSpy } = await setup();
    const resetOnSavedSearchChangeSpy = jest.spyOn(
      internalStateSlice.actions,
      'resetOnSavedSearchChange'
    );
    const initialPersisted = toolkit.internalState.getState().persistedDiscoverSession;

    saveDiscoverSessionSpy.mockResolvedValueOnce(undefined);

    await toolkit.internalState.dispatch(
      internalStateActions.saveDiscoverSession(getSaveDiscoverSessionParams())
    );

    expect(toolkit.internalState.getState().persistedDiscoverSession).toBe(initialPersisted);
    expect(resetOnSavedSearchChangeSpy).not.toHaveBeenCalled();
  });

  it.each([
    { action: 'Save', copyOnSave: false, method: 'upsert' as const },
    { action: 'Save As', copyOnSave: true, method: 'create' as const },
  ])(
    'should propagate HTTP $action errors without resetting the session or pending changes',
    async ({ copyOnSave, method }) => {
      const { toolkit, services, saveDiscoverSessionSpy } = await setup({ initializeTab: true });
      const initialPersisted = toolkit.internalState.getState().persistedDiscoverSession;
      const tabId = toolkit.getCurrentTab().id;
      const resetOnSavedSearchChangeSpy = jest.spyOn(
        internalStateSlice.actions,
        'resetOnSavedSearchChange'
      );
      const apiClient: jest.Mocked<DiscoverSessionClient> = {
        get: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      };
      const saveError = new Error('Save failed');
      apiClient[method].mockRejectedValueOnce(saveError);
      const discoverSessionService = createDiscoverSessionService({
        apiClient,
        legacyClient: services.savedSearch,
        useHttpApi: true,
      });
      saveDiscoverSessionSpy.mockImplementation(discoverSessionService.save);

      toolkit.internalState.dispatch(
        internalStateActions.updateAppState({ tabId, appState: { columns: ['message'] } })
      );
      const expectedChanges = { hasUnsavedChanges: true, unsavedTabIds: [tabId] };
      const comparisonContext = { runtimeStateManager: toolkit.runtimeStateManager, services };
      expect(selectHasUnsavedChanges(toolkit.internalState.getState(), comparisonContext)).toEqual(
        expectedChanges
      );

      await expect(
        toolkit.internalState
          .dispatch(
            internalStateActions.saveDiscoverSession(
              getSaveDiscoverSessionParams({ newCopyOnSave: copyOnSave })
            )
          )
          .unwrap()
      ).rejects.toHaveProperty('message', saveError.message);

      expect(apiClient[method]).toHaveBeenCalledTimes(1);
      expect(apiClient.get).not.toHaveBeenCalled();
      expect(toolkit.internalState.getState().persistedDiscoverSession).toBe(initialPersisted);
      expect(toolkit.getCurrentTab().id).toBe(tabId);
      expect(toolkit.getCurrentTab().appState.columns).toEqual(['message']);
      expect(resetOnSavedSearchChangeSpy).not.toHaveBeenCalled();
      expect(selectHasUnsavedChanges(toolkit.internalState.getState(), comparisonContext)).toEqual(
        expectedChanges
      );
    }
  );

  describe('timeRestore, timeRange, and refreshInterval handling', () => {
    const TIME_RANGE_30M = { from: 'now-30m', to: 'now' };
    const REFRESH_INTERVAL_5S = { value: 5000, pause: true };
    const TIME_RANGE_15M = { from: 'now-15m', to: 'now' };
    const REFRESH_INTERVAL_10S = { value: 10000, pause: false };
    const TIME_RANGE_1H = { from: 'now-1h', to: 'now' };
    const REFRESH_INTERVAL_20S = { value: 20000, pause: false };
    const TIME_RANGE_7D = { from: 'now-7d', to: 'now' };
    const REFRESH_INTERVAL_30S = { value: 30000, pause: true };

    const findSavedTab = (
      saveDiscoverSessionSpy: jest.SpyInstance,
      tabId: string
    ): { timeRestore?: boolean; timeRange?: unknown; refreshInterval?: unknown } | undefined =>
      saveDiscoverSessionSpy.mock.calls[0][0].tabs.find((t: { id: string }) => t.id === tabId);

    describe('when an initialized tab', () => {
      it.each([
        {
          scenario: 'newTimeRestore is true',
          newTimeRestore: true,
          expectedTimeRestore: true,
          expectedTimeRange: TIME_RANGE_30M,
          expectedRefreshInterval: REFRESH_INTERVAL_5S,
        },
        {
          scenario: 'newTimeRestore is false',
          newTimeRestore: false,
          expectedTimeRestore: false,
          expectedTimeRange: undefined,
          expectedRefreshInterval: undefined,
        },
      ])(
        'should save time settings correctly when $scenario',
        async ({
          newTimeRestore,
          expectedTimeRestore,
          expectedTimeRange,
          expectedRefreshInterval,
        }) => {
          const { toolkit, saveDiscoverSessionSpy } = await setup({ initializeTab: true });

          toolkit.internalState.dispatch(
            internalStateSlice.actions.setGlobalState({
              tabId: toolkit.getCurrentTab().id,
              globalState: { timeRange: TIME_RANGE_30M, refreshInterval: REFRESH_INTERVAL_5S },
            })
          );

          await toolkit.internalState.dispatch(
            internalStateActions.saveDiscoverSession(
              getSaveDiscoverSessionParams({ newTimeRestore })
            )
          );

          expect(saveDiscoverSessionSpy).toHaveBeenCalled();
          const savedTab = findSavedTab(saveDiscoverSessionSpy, toolkit.getCurrentTab().id);
          expect(savedTab?.timeRestore).toBe(expectedTimeRestore);
          expect(savedTab?.timeRange).toEqual(expectedTimeRange);
          expect(savedTab?.refreshInterval).toEqual(expectedRefreshInterval);
        }
      );
    });

    describe('when an uninitialized tab', () => {
      it.each([
        {
          scenario: 'newTimeRestore is true',
          newTimeRestore: true,
          expectedTimeRestore: true,
          expectedTimeRange: TIME_RANGE_15M,
          expectedRefreshInterval: REFRESH_INTERVAL_10S,
        },
        {
          scenario: 'newTimeRestore is false',
          newTimeRestore: false,
          expectedTimeRestore: false,
          expectedTimeRange: undefined,
          expectedRefreshInterval: undefined,
        },
      ])(
        'should save time settings correctly when $scenario',
        async ({
          newTimeRestore,
          expectedTimeRestore,
          expectedTimeRange,
          expectedRefreshInterval,
        }) => {
          const { toolkit, saveDiscoverSessionSpy } = await setup({
            additionalPersistedTabs: (services) => [
              getPersistedTabMock({
                tabId: 'time-tab',
                dataView: dataViewMock,
                globalStateOverrides: {
                  timeRange: TIME_RANGE_15M,
                  refreshInterval: REFRESH_INTERVAL_10S,
                },
                overridenTimeRestore: true,
                services,
              }),
            ],
          });

          await toolkit.internalState.dispatch(
            internalStateActions.saveDiscoverSession(
              getSaveDiscoverSessionParams({ newTimeRestore })
            )
          );

          expect(saveDiscoverSessionSpy).toHaveBeenCalled();
          const savedTab = findSavedTab(saveDiscoverSessionSpy, 'time-tab');
          expect(savedTab?.timeRestore).toBe(expectedTimeRestore);
          expect(savedTab?.timeRange).toEqual(expectedTimeRange);
          expect(savedTab?.refreshInterval).toEqual(expectedRefreshInterval);
        }
      );

      it('should use the selected tab time range for uninitialized tabs without their own time range when newTimeRestore is true', async () => {
        const { toolkit, saveDiscoverSessionSpy } = await setup({
          initializeTab: true,
          additionalPersistedTabs: (services) => [
            getPersistedTabMock({
              tabId: 'uninitialized-tab',
              dataView: dataViewMock,
              services,
            }),
          ],
        });

        toolkit.internalState.dispatch(
          internalStateSlice.actions.setGlobalState({
            tabId: toolkit.getCurrentTab().id,
            globalState: { timeRange: TIME_RANGE_1H, refreshInterval: REFRESH_INTERVAL_20S },
          })
        );

        await toolkit.internalState.dispatch(
          internalStateActions.saveDiscoverSession(
            getSaveDiscoverSessionParams({ newTimeRestore: true })
          )
        );

        expect(saveDiscoverSessionSpy).toHaveBeenCalled();
        const savedTab = findSavedTab(saveDiscoverSessionSpy, 'uninitialized-tab');
        expect(savedTab?.timeRestore).toBe(true);
        expect(savedTab?.timeRange).toEqual(TIME_RANGE_1H);
        expect(savedTab?.refreshInterval).toEqual(REFRESH_INTERVAL_20S);
      });

      it('should not use the selected tab time range for uninitialized tabs if they have their own time range', async () => {
        const { toolkit, saveDiscoverSessionSpy } = await setup({
          initializeTab: true,
          additionalPersistedTabs: (services) => [
            getPersistedTabMock({
              tabId: 'uninitialized-tab-with-time',
              dataView: dataViewMock,
              globalStateOverrides: {
                timeRange: TIME_RANGE_7D,
                refreshInterval: REFRESH_INTERVAL_30S,
              },
              overridenTimeRestore: true,
              services,
            }),
          ],
        });

        toolkit.internalState.dispatch(
          internalStateSlice.actions.setGlobalState({
            tabId: toolkit.getCurrentTab().id,
            globalState: { timeRange: TIME_RANGE_1H, refreshInterval: REFRESH_INTERVAL_20S },
          })
        );

        await toolkit.internalState.dispatch(
          internalStateActions.saveDiscoverSession(
            getSaveDiscoverSessionParams({ newTimeRestore: true })
          )
        );

        expect(saveDiscoverSessionSpy).toHaveBeenCalled();
        const savedTab = findSavedTab(saveDiscoverSessionSpy, 'uninitialized-tab-with-time');
        expect(savedTab?.timeRestore).toBe(true);
        expect(savedTab?.timeRange).toEqual(TIME_RANGE_7D);
        expect(savedTab?.refreshInterval).toEqual(REFRESH_INTERVAL_30S);
      });
    });
  });

  it('should preserve inline views and their sharing when copying a session', async () => {
    const sharedSpec = { id: 'adhoc-id', title: 'Adhoc', name: 'Adhoc Name' };
    const otherSpec = { id: 'other-id', title: 'Other', name: 'Other Name' };
    const specs = [sharedSpec, sharedSpec, otherSpec];
    const { toolkit, saveDiscoverSessionSpy, dataViewCreateSpy, dataViewsClearCacheSpy } =
      await setup({
        additionalPersistedTabs: (services) =>
          specs.map((spec, index) =>
            fromTabStateToSavedObjectTab({
              tab: getTabStateMock({
                id: `inline-tab-${index}`,
                initialInternalState: {
                  serializedSearchSource: {
                    index: spec,
                    filter: [createFilter(spec.id)],
                  },
                },
              }),
              services,
              currentDataView: undefined,
              tabType: undefined,
            })
          ),
      });
    const originalSession = toolkit.internalState.getState().persistedDiscoverSession;
    dataViewCreateSpy.mockClear();
    dataViewsClearCacheSpy.mockClear();

    await toolkit.internalState
      .dispatch(
        internalStateActions.saveDiscoverSession(
          getSaveDiscoverSessionParams({ newCopyOnSave: true })
        )
      )
      .unwrap();

    expect(dataViewCreateSpy).not.toHaveBeenCalled();
    expect(dataViewsClearCacheSpy).not.toHaveBeenCalled();
    expect(toolkit.internalState.getState().persistedDiscoverSession?.id).toBe('copied-session');
    const tabs = saveDiscoverSessionSpy.mock.calls[0][0].tabs;
    expect(tabs.map((tab) => tab.serializedSearchSource)).toStrictEqual(
      originalSession?.tabs.map((tab) => tab.serializedSearchSource)
    );
    expect(new Set(tabs.map((tab) => tab.id)).size).toBe(tabs.length);
    for (const [index, tab] of tabs.entries()) {
      expect(tab.id).not.toBe(originalSession?.tabs[index].id);
    }
    expect(
      tabs.slice(1).map((tab) => tab.serializedSearchSource.filter?.[0].meta.index)
    ).toStrictEqual(specs.map(generateInlineDataViewId));
  });

  it.each([
    { action: 'Save', newCopyOnSave: false },
    { action: 'Save As', newCopyOnSave: true },
  ])('should copy a shared profile view by value on $action', async ({ newCopyOnSave }) => {
    const defaultProfileId = 'default-profile-id';
    const filters = [
      buildCombinedFilter(BooleanRelation.OR, [createFilter(defaultProfileId)], {
        id: defaultProfileId,
      }),
      {
        ...createFilter(defaultProfileId),
        $state: { store: FilterStateStore.GLOBAL_STATE },
      },
    ];
    const copySpec = { title: 'Adhoc', name: 'Adhoc Name (new title)', managed: false };
    const copyId = generateInlineDataViewId(copySpec);
    const { toolkit, saveDiscoverSessionSpy, dataViewCreateSpy, dataViewsClearCacheSpy } =
      await setup({
        additionalPersistedTabs: (services) =>
          ['profile-tab', 'duplicate-tab'].map((id) =>
            fromTabStateToSavedObjectTab({
              tab: getTabStateMock({
                id,
                initialInternalState: {
                  serializedSearchSource: {
                    index: {
                      id: defaultProfileId,
                      title: 'Adhoc',
                      name: 'Adhoc Name',
                      managed: true,
                    },
                    filter: filters,
                  },
                },
              }),
              services,
              currentDataView: undefined,
              tabType: undefined,
            })
          ),
      });

    toolkit.internalState.dispatch(
      internalStateSlice.actions.setDefaultProfileAdHocDataViewIds([defaultProfileId])
    );

    await toolkit.internalState
      .dispatch(
        internalStateActions.saveDiscoverSession(getSaveDiscoverSessionParams({ newCopyOnSave }))
      )
      .unwrap();

    expect(dataViewCreateSpy).toHaveBeenCalledWith({ ...copySpec, id: copyId });
    expect(dataViewsClearCacheSpy).not.toHaveBeenCalled();
    expect(toolkit.internalState.getState().defaultProfileAdHocDataViewIds).toStrictEqual([
      defaultProfileId,
    ]);
    const copiedTabs = saveDiscoverSessionSpy.mock.calls[0][0].tabs.slice(1);
    expect(copiedTabs).toHaveLength(2);
    for (const tab of copiedTabs) {
      expect(tab.serializedSearchSource.index).toStrictEqual({ ...copySpec, id: copyId });
      expect(tab.serializedSearchSource.filter).toMatchObject([
        { meta: { index: copyId, params: [{ meta: { index: copyId } }] } },
        { meta: { index: copyId }, $state: { store: FilterStateStore.GLOBAL_STATE } },
      ]);
    }
  });

  it.each([
    {
      description: 'ES|QL views',
      spec: { id: 'excluded-id', title: 'ES|QL Adhoc', type: ESQL_TYPE },
      expectedSpec: { id: 'excluded-id', type: ESQL_TYPE },
      creationCount: 0,
    },
    {
      description: 'managed views outside the profile',
      spec: { id: 'excluded-id', title: 'Managed', managed: true },
      expectedSpec: { id: expect.stringMatching(/^[0-9a-f]{8}-/), managed: false },
      creationCount: 1,
    },
  ])(
    'should retain Save As behavior for $description',
    async ({ spec, expectedSpec, creationCount }) => {
      const { toolkit, saveDiscoverSessionSpy, dataViewCreateSpy, dataViewsClearCacheSpy } =
        await setup({
          additionalPersistedTabs: (services) => [
            fromTabStateToSavedObjectTab({
              tab: getTabStateMock({
                id: 'excluded-tab',
                initialInternalState: {
                  serializedSearchSource: {
                    index: spec,
                  },
                },
              }),
              services,
              currentDataView: undefined,
              tabType: undefined,
            }),
          ],
        });

      await toolkit.internalState
        .dispatch(
          internalStateActions.saveDiscoverSession(
            getSaveDiscoverSessionParams({ newCopyOnSave: true })
          )
        )
        .unwrap();

      expect(saveDiscoverSessionSpy).toHaveBeenCalled();
      expect(dataViewCreateSpy).toHaveBeenCalledTimes(creationCount);
      expect(dataViewsClearCacheSpy).toHaveBeenCalledTimes(creationCount);

      const tabs = saveDiscoverSessionSpy.mock.calls[0][0].tabs;
      expect(tabs).toHaveLength(2);

      const savedTab = tabs[1];
      expect(savedTab?.id).not.toBe('excluded-tab');
      expect(savedTab?.serializedSearchSource.index).toMatchObject(expectedSpec);
    }
  );

  it('should apply overriddenVisContextAfterInvalidation to the saved tab', async () => {
    const { toolkit, saveDiscoverSessionSpy } = await setup({
      additionalPersistedTabs: (services) => [
        getPersistedTabMock({
          tabId: 'vis-context-tab',
          dataView: dataViewMock,
          services,
        }),
      ],
    });
    const visContext = { foo: 'bar' };

    toolkit.internalState.dispatch(
      internalStateActions.setOverriddenVisContextAfterInvalidation({
        tabId: 'vis-context-tab',
        overriddenVisContextAfterInvalidation: visContext,
      })
    );

    await toolkit.internalState.dispatch(
      internalStateActions.saveDiscoverSession(getSaveDiscoverSessionParams())
    );

    expect(saveDiscoverSessionSpy).toHaveBeenCalled();

    const tabs = saveDiscoverSessionSpy.mock.calls[0][0].tabs;
    const savedTab = tabs.find((t) => t.id === 'vis-context-tab');

    expect(savedTab?.visContext).toEqual(visContext);
  });
});
