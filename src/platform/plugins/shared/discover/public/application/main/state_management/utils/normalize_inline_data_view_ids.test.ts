/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { cloneDeep } from 'lodash';
import { createDataViewDataSource } from '../../../../../common/data_sources';
import { generateInlineDataViewId } from '../../../../../common/session/inline_data_view';
import {
  createFilter,
  createFilterWithIndex,
  foreignFilter,
  unreferencedFilter,
} from '../../../../../common/session/inline_data_view.fixtures';
import { getTabStateMock } from '../redux/__mocks__/internal_state.mocks';
import type { TabStateInLocalStorage } from '../tabs_storage_manager';
import {
  normalizeInlineDataViewIds,
  normalizeUrlAppState,
  prepareInlineDataViewLoadState,
} from './normalize_inline_data_view_ids';

const inlineDataView: DataViewSpec = {
  title: 'logs-*',
  name: 'Inline logs',
  timeFieldName: '@timestamp',
  sourceFilters: [{ value: 'secret.*' }],
};
const editedDataView: DataViewSpec = { ...inlineDataView, title: 'other-logs-*' };
const inlineDataViewId = generateInlineDataViewId(inlineDataView);
const editedDataViewId = generateInlineDataViewId(editedDataView);

const createSessionTab = (
  id: string,
  index: DataViewSpec | string = inlineDataView,
  filter: Filter[] = [unreferencedFilter, foreignFilter]
): DiscoverSessionTab => ({
  id,
  label: id,
  sort: [],
  columns: [],
  grid: {},
  hideChart: true,
  hideTable: false,
  isTextBasedQuery: false,
  usesAdHocDataView: typeof index !== 'string',
  serializedSearchSource: { index, filter: cloneDeep(filter) },
});

const createStoredTab = (overrides: Partial<TabStateInLocalStorage>): TabStateInLocalStorage => ({
  id: 'tab',
  label: 'Tab',
  internalState: undefined,
  attributes: undefined,
  appState: undefined,
  globalState: undefined,
  profileState: undefined,
  ...overrides,
});

const restoreTab = ({ id, internalState, appState }: TabStateInLocalStorage) =>
  getTabStateMock({ id, initialInternalState: internalState, appState: appState ?? {} });

const createLocalTab = (id: string, dataView: DataViewSpec): TabStateInLocalStorage => {
  const filters = [createFilter(dataView.id), foreignFilter];
  const dataSource = dataView.id
    ? createDataViewDataSource({ dataViewId: dataView.id })
    : undefined;

  return createStoredTab({
    id,
    internalState: {
      serializedSearchSource: { index: dataView, filter: cloneDeep(filters) },
    },
    appState: { dataSource, filters: cloneDeep(filters) },
    globalState: { filters: [] },
  });
};

const normalize = ({
  sessionTabs = [],
  openTabs = [],
  closedTabs = [],
  defaultTab,
  openTabsFromSession = true,
  navigationDataViewSpec,
  savedDataViewIds = [],
}: Partial<Parameters<typeof normalizeInlineDataViewIds>[0]>) =>
  normalizeInlineDataViewIds({
    sessionTabs,
    openTabs,
    closedTabs,
    defaultTab,
    openTabsFromSession,
    navigationDataViewSpec,
    savedDataViewIds,
  });

describe('normalizeInlineDataViewIds', () => {
  it.each([undefined, {}])('preserves absent or empty stored state: %p', (state) => {
    const tab = createStoredTab({
      internalState: { serializedSearchSource: { index: inlineDataView } },
      appState: state,
      globalState: state,
    });

    const { openTabs } = normalize({ openTabs: [tab] });

    expect(openTabs[0].internalState?.serializedSearchSource?.index).toStrictEqual({
      ...inlineDataView,
      id: inlineDataViewId,
    });
    expect(openTabs[0].appState).toBe(state);
    expect(openTabs[0].globalState).toBe(state);
  });

  it('includes the default tab in the shared map without resolving ambiguous pinned references', () => {
    const pinnedFilter: Filter = {
      ...createFilter('legacy-id'),
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    const defaultTab = createSessionTab('default', { ...inlineDataView, id: 'legacy-id' }, [
      createFilter('legacy-id'),
      pinnedFilter,
    ]);
    const closedTab = {
      ...createLocalTab('closed', { ...editedDataView, id: 'legacy-id' }),
      closedAt: 1,
    };

    const normalized = normalize({ defaultTab, closedTabs: [closedTab] });

    expect(normalized.defaultTab).toMatchObject({
      serializedSearchSource: {
        index: { id: inlineDataViewId },
        filter: [createFilter(inlineDataViewId), pinnedFilter],
      },
    });
    expect(normalized.closedTabs[0]).toMatchObject({
      closedAt: 1,
      internalState: { serializedSearchSource: { index: { id: editedDataViewId } } },
      appState: { dataSource: createDataViewDataSource({ dataViewId: editedDataViewId }) },
    });
    expect(normalized.loadCompatibility.ids.shared.has('legacy-id')).toBe(false);
  });

  it('assigns the spec ID to API tabs and binds their unreferenced filters', () => {
    const sessionTabs = [createSessionTab('api-a'), createSessionTab('api-b')];

    const {
      sessionTabs: normalizedTabs,
      loadCompatibility: { ids: { shared } },
    } = normalize({ sessionTabs });

    expect(normalizedTabs.map(({ serializedSearchSource }) => serializedSearchSource)).toEqual([
      {
        index: { ...inlineDataView, id: inlineDataViewId },
        filter: [createFilterWithIndex(unreferencedFilter, inlineDataViewId), foreignFilter],
      },
      {
        index: { ...inlineDataView, id: inlineDataViewId },
        filter: [createFilterWithIndex(unreferencedFilter, inlineDataViewId), foreignFilter],
      },
    ]);
    expect(shared.size).toBe(0);
  });

  it('gives independent views with the same spec the same identity', () => {
    const {
      sessionTabs,
      loadCompatibility: { ids: { shared } },
    } = normalize({
      sessionTabs: [
        createSessionTab('first', { ...inlineDataView, id: 'first-id' }),
        createSessionTab('second', { ...inlineDataView, id: 'second-id' }),
      ],
    });

    const indexes = sessionTabs.map(({ serializedSearchSource }) => serializedSearchSource.index);

    expect(indexes).toEqual([
      { ...inlineDataView, id: inlineDataViewId },
      { ...inlineDataView, id: inlineDataViewId },
    ]);
    expect(Object.fromEntries(shared)).toEqual({
      'first-id': inlineDataViewId,
      'second-id': inlineDataViewId,
    });
  });

  it('keeps a local edit with the identity of its own spec', () => {
    const { sessionTabs, openTabs } = normalize({
      sessionTabs: [createSessionTab('tab', { ...inlineDataView, id: 'saved-id' })],
      openTabs: [createLocalTab('tab', { ...editedDataView, id: 'edited-id' })],
    });

    expect(sessionTabs[0].serializedSearchSource.index).toEqual({
      ...inlineDataView,
      id: inlineDataViewId,
    });
    expect(openTabs[0]).toMatchObject({
      internalState: {
        serializedSearchSource: {
          index: { ...editedDataView, id: editedDataViewId },
          filter: [createFilter(editedDataViewId), foreignFilter],
        },
      },
      appState: {
        dataSource: createDataViewDataSource({ dataViewId: editedDataViewId }),
        filters: [createFilter(editedDataViewId), foreignFilter],
      },
    });
  });

  it('translates pinned references without binding unreferenced pinned filters', () => {
    const pinnedFilter = {
      ...createFilter('legacy-id'),
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    const unreferencedPinnedFilter = {
      ...unreferencedFilter,
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    const localTab = {
      ...createLocalTab('tab', { ...inlineDataView, id: 'legacy-id' }),
      globalState: { filters: [pinnedFilter, unreferencedPinnedFilter] },
    };

    const { openTabs } = normalize({ openTabs: [localTab] });

    expect(openTabs[0].globalState?.filters).toEqual([
      { ...pinnedFilter, meta: { index: inlineDataViewId } },
      unreferencedPinnedFilter,
    ]);
  });

  it('keeps pinned filters on a previous ID shared by different specs', () => {
    const pinnedFilter: Filter = {
      ...createFilter('shared-id'),
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    const createTab = (id: string, dataView: DataViewSpec): TabStateInLocalStorage => ({
      ...createLocalTab(id, { ...dataView, id: 'shared-id' }),
      internalState: {
        serializedSearchSource: {
          index: { ...dataView, id: 'shared-id' },
          filter: [pinnedFilter, createFilter('shared-id')],
        },
      },
      globalState: { filters: [pinnedFilter] },
    });
    const expectedTab = (dataViewId: string) => ({
      internalState: {
        serializedSearchSource: {
          index: { id: dataViewId },
          filter: [pinnedFilter, createFilter(dataViewId)],
        },
      },
      appState: { filters: [createFilter(dataViewId), foreignFilter] },
      globalState: { filters: [pinnedFilter] },
    });

    const {
      openTabs,
      loadCompatibility: { ids: { shared } },
    } = normalize({
      openTabs: [createTab('logs', inlineDataView), createTab('edited', editedDataView)],
    });

    expect(shared.has('shared-id')).toBe(false);
    expect(openTabs).toMatchObject([expectedTab(inlineDataViewId), expectedTab(editedDataViewId)]);
  });

  it('does not bind unreferenced pinned filters of a spec without an ID', () => {
    const unreferencedPinnedFilter = {
      ...unreferencedFilter,
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    const filters = [unreferencedPinnedFilter, unreferencedFilter];
    const localTab = createStoredTab({
      id: 'local',
      internalState: {
        serializedSearchSource: { index: inlineDataView, filter: cloneDeep(filters) },
      },
    });

    const { sessionTabs, openTabs } = normalize({
      sessionTabs: [createSessionTab('api', inlineDataView, filters)],
      openTabs: [localTab],
    });
    const expectedFilters = [
      unreferencedPinnedFilter,
      createFilterWithIndex(unreferencedFilter, inlineDataViewId),
    ];

    expect(sessionTabs[0].serializedSearchSource.filter).toEqual(expectedFilters);
    expect(openTabs[0].internalState?.serializedSearchSource?.filter).toEqual(expectedFilters);
  });

  it('binds unreferenced app filters of a local tab whose document spec has no ID', () => {
    const pinnedFilter = {
      ...unreferencedFilter,
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    const dataSource = createDataViewDataSource({ dataViewId: inlineDataViewId });
    const localTab = createStoredTab({
      id: 'tab',
      internalState: {
        serializedSearchSource: {
          index: { ...inlineDataView, id: inlineDataViewId },
          filter: [pinnedFilter, unreferencedFilter, foreignFilter],
        },
      },
      appState: { dataSource, filters: [unreferencedFilter, foreignFilter] },
      globalState: { filters: [pinnedFilter] },
    });

    const { openTabs } = normalize({
      sessionTabs: [createSessionTab('tab')],
      openTabs: [localTab],
    });
    const [normalizedTab] = openTabs;
    const boundFilter = createFilterWithIndex(unreferencedFilter, inlineDataViewId);

    expect(normalizedTab.internalState?.serializedSearchSource?.filter).toEqual([
      pinnedFilter,
      boundFilter,
      foreignFilter,
    ]);
    expect(normalizedTab.appState?.filters).toEqual([boundFilter, foreignFilter]);
    expect(normalizedTab.globalState?.filters).toEqual([pinnedFilter]);
  });

  it('applies the document convention only to open tabs stored for the same session', () => {
    const localTab = createStoredTab({
      id: 'tab',
      internalState: {
        serializedSearchSource: {
          index: { ...editedDataView, id: editedDataViewId },
          filter: [unreferencedFilter],
        },
      },
      appState: {
        dataSource: createDataViewDataSource({ dataViewId: editedDataViewId }),
        filters: [unreferencedFilter],
      },
    });
    const closedTab = { ...localTab, closedAt: 1 };
    const sessionTabs = [createSessionTab('tab')];

    const sameSession = normalize({ sessionTabs, openTabs: [localTab], closedTabs: [closedTab] });
    const otherSession = normalize({
      sessionTabs,
      openTabs: [localTab],
      closedTabs: [closedTab],
      openTabsFromSession: false,
    });

    expect(sameSession.openTabs[0].appState?.filters).toStrictEqual([
      createFilterWithIndex(unreferencedFilter, editedDataViewId),
    ]);
    expect(sameSession.closedTabs[0]).toBe(closedTab);
    expect(otherSession.openTabs[0]).toBe(localTab);
    expect(otherSession.closedTabs[0]).toBe(closedTab);

    const urlAppState = {
      dataSource: createDataViewDataSource({ dataViewId: editedDataViewId }),
      filters: [unreferencedFilter],
    };
    const selectedTab = getTabStateMock({ id: 'tab' });

    expect(
      normalizeUrlAppState({ appState: urlAppState, selectedTab, normalized: sameSession })
    ).toStrictEqual({
      ...urlAppState,
      filters: [createFilterWithIndex(unreferencedFilter, editedDataViewId)],
    });
    expect(
      normalizeUrlAppState({ appState: urlAppState, selectedTab, normalized: otherSession })
    ).toBe(urlAppState);
  });

  it('binds unreferenced app filters of a local edit to its own view', () => {
    const localTab = createStoredTab({
      id: 'tab',
      internalState: {
        serializedSearchSource: {
          index: { ...editedDataView, id: 'edited-id' },
          filter: [unreferencedFilter],
        },
      },
      appState: {
        dataSource: createDataViewDataSource({ dataViewId: 'edited-id' }),
        filters: [unreferencedFilter],
      },
    });

    const { sessionTabs, openTabs } = normalize({
      sessionTabs: [createSessionTab('tab')],
      openTabs: [localTab],
    });
    const boundFilter = createFilterWithIndex(unreferencedFilter, editedDataViewId);

    expect(sessionTabs[0].serializedSearchSource.index).toEqual({
      ...inlineDataView,
      id: inlineDataViewId,
    });
    expect(openTabs[0].internalState?.serializedSearchSource).toEqual({
      index: { ...editedDataView, id: editedDataViewId },
      filter: [boundFilter],
    });
    expect(openTabs[0].appState).toEqual({
      dataSource: createDataViewDataSource({ dataViewId: editedDataViewId }),
      filters: [boundFilter],
    });
  });

  it('keeps unreferenced filters when the document spec has an ID', () => {
    const localTab = createStoredTab({
      id: 'tab',
      internalState: {
        serializedSearchSource: {
          index: { ...inlineDataView, id: 'saved-id' },
          filter: [unreferencedFilter],
        },
      },
      appState: {
        dataSource: createDataViewDataSource({ dataViewId: 'saved-id' }),
        filters: [unreferencedFilter],
      },
    });

    const { sessionTabs, openTabs } = normalize({
      sessionTabs: [createSessionTab('tab', { ...inlineDataView, id: 'saved-id' })],
      openTabs: [localTab],
    });

    expect(sessionTabs[0].serializedSearchSource.filter).toEqual([
      unreferencedFilter,
      foreignFilter,
    ]);
    expect(openTabs[0].internalState?.serializedSearchSource?.filter).toEqual([unreferencedFilter]);
    expect(openTabs[0].appState?.filters).toEqual([unreferencedFilter]);
  });

  it('keeps the document identity when the navigation brings another spec', () => {
    const { sessionTabs, navigationDataViewSpec } = normalize({
      sessionTabs: [createSessionTab('tab')],
      navigationDataViewSpec: { ...editedDataView, id: 'link-id' },
    });

    expect(sessionTabs[0].serializedSearchSource).toEqual({
      index: { ...inlineDataView, id: inlineDataViewId },
      filter: [createFilterWithIndex(unreferencedFilter, inlineDataViewId), foreignFilter],
    });
    expect(navigationDataViewSpec).toEqual({ ...editedDataView, id: editedDataViewId });
  });

  it('leaves an ambiguous previous ID out of spec-less references', () => {
    const {
      sessionTabs,
      openTabs,
      loadCompatibility: { ids: { shared } },
    } = normalize({
      sessionTabs: [
        createSessionTab('saved', { ...inlineDataView, id: 'shared-id' }, [
          createFilter('shared-id'),
        ]),
      ],
      openTabs: [createLocalTab('local', { ...editedDataView, id: 'shared-id' })],
    });

    expect(shared.has('shared-id')).toBe(false);
    expect(sessionTabs[0].serializedSearchSource).toEqual({
      index: { ...inlineDataView, id: inlineDataViewId },
      filter: [createFilter(inlineDataViewId)],
    });
    expect(openTabs[0].internalState?.serializedSearchSource).toEqual({
      index: { ...editedDataView, id: editedDataViewId },
      filter: [createFilter(editedDataViewId), foreignFilter],
    });
  });

  it('normalizes the navigation spec and translates references to its previous ID', () => {
    const { navigationDataViewSpec, loadCompatibility } = normalize({
      navigationDataViewSpec: { ...inlineDataView, id: 'link-id' },
    });

    expect(navigationDataViewSpec).toEqual({ ...inlineDataView, id: inlineDataViewId });
    expect(loadCompatibility.ids.shared.get('link-id')).toBe(inlineDataViewId);
  });

  it('leaves excluded views unchanged in session and local tabs', () => {
    const sessionTabs = [
      createSessionTab('profile', { ...inlineDataView, id: 'profile-id', managed: true }),
    ];
    const esqlTab = createStoredTab({
      id: 'esql',
      internalState: {
        serializedSearchSource: {
          index: { ...inlineDataView, id: 'esql-id' },
          query: { esql: 'FROM logs-*' },
        },
      },
    });

    const normalized = normalize({ sessionTabs, openTabs: [esqlTab] });

    expect(normalized.sessionTabs).toBe(sessionTabs);
    expect(normalized.openTabs[0]).toBe(esqlTab);
    expect(normalized.loadCompatibility.ids.shared.size).toBe(0);
  });

  it('is idempotent and does not mutate its input', () => {
    const input = {
      sessionTabs: [
        createSessionTab('api'),
        createSessionTab('legacy', { ...inlineDataView, id: 'legacy-id' }),
      ],
      openTabs: [createLocalTab('legacy', { ...inlineDataView, id: 'local-id' })],
      navigationDataViewSpec: { ...inlineDataView, id: 'link-id' },
    };
    const originalInput = cloneDeep(input);

    const first = normalize(input);
    const second = normalize(first);

    expect(second.sessionTabs).toBe(first.sessionTabs);
    second.openTabs.forEach((tab, index) => expect(tab).toBe(first.openTabs[index]));
    expect(second.navigationDataViewSpec).toEqual(first.navigationDataViewSpec);
    expect(second.loadCompatibility.ids.shared.size).toBe(0);
    expect(input).toStrictEqual(originalInput);
  });

  describe('saved chart request data', () => {
    const createVisContext = (dataViewId: string | undefined) => ({
      suggestionType: 'lensSuggestion',
      requestData: { dataViewId, timeField: '@timestamp' },
      attributes: { visualizationType: 'lnsXY' },
    });
    const withChart = (tab: DiscoverSessionTab, dataViewId: string | undefined) => ({
      ...tab,
      visContext: createVisContext(dataViewId),
    });
    const createStoredChartTab = (dataView: DataViewSpec, dataViewId: string | undefined) =>
      createStoredTab({
        internalState: { serializedSearchSource: { index: dataView } },
        attributes: {
          visContext: createVisContext(dataViewId),
          controlGroupState: undefined,
          timeRestore: false,
        },
      });

    it('remaps the previous ID of the tab view in session and stored tabs', () => {
      const legacyDataView = { ...inlineDataView, id: 'legacy-id' };

      const { sessionTabs, openTabs, closedTabs } = normalize({
        sessionTabs: [withChart(createSessionTab('tab', legacyDataView), 'legacy-id')],
        openTabs: [createStoredChartTab(legacyDataView, 'legacy-id')],
        closedTabs: [{ ...createStoredChartTab(legacyDataView, 'legacy-id'), closedAt: 1 }],
      });

      expect(sessionTabs[0].visContext).toStrictEqual(createVisContext(inlineDataViewId));
      expect(openTabs[0].attributes?.visContext).toStrictEqual(createVisContext(inlineDataViewId));
      expect(closedTabs[0].attributes?.visContext).toStrictEqual(
        createVisContext(inlineDataViewId)
      );
    });

    it('remaps a previous ID shared by different specs with the view of each tab', () => {
      const {
        sessionTabs,
        loadCompatibility: { ids: { shared } },
      } = normalize({
        sessionTabs: [
          withChart(createSessionTab('a', { ...inlineDataView, id: 'legacy-id' }), 'legacy-id'),
          withChart(createSessionTab('b', { ...editedDataView, id: 'legacy-id' }), 'legacy-id'),
        ],
      });

      expect(shared.has('legacy-id')).toBe(false);
      expect(sessionTabs.map(({ visContext }) => visContext)).toStrictEqual([
        createVisContext(inlineDataViewId),
        createVisContext(editedDataViewId),
      ]);
    });

    it.each([
      ['another view', 'other-data-view'],
      ['no view', undefined],
    ])('keeps a chart for %s', (_description, dataViewId) => {
      const sessionTab = withChart(
        createSessionTab('tab', { ...inlineDataView, id: 'legacy-id' }),
        dataViewId
      );
      const storedTab = createStoredChartTab({ ...inlineDataView, id: 'legacy-id' }, dataViewId);

      const { sessionTabs, openTabs } = normalize({
        sessionTabs: [sessionTab],
        openTabs: [storedTab],
      });

      expect(sessionTabs[0].visContext).toBe(sessionTab.visContext);
      expect(openTabs[0].attributes).toBe(storedTab.attributes);
    });

    it('keeps an ES|QL chart and a cleared chart', () => {
      const esqlTab: DiscoverSessionTab = {
        ...createSessionTab('esql', { id: 'esql-dv', title: 'logs-*', type: 'esql' }, []),
        isTextBasedQuery: true,
        serializedSearchSource: {
          query: { esql: 'FROM logs-*' },
          index: { id: 'esql-dv', title: 'logs-*', type: 'esql' },
        },
        visContext: createVisContext('esql-dv'),
      };
      const clearedTab = { ...createSessionTab('cleared'), visContext: {} };
      const legacyTab = withChart(
        createSessionTab('legacy', { ...inlineDataView, id: 'esql-dv-legacy' }),
        'esql-dv-legacy'
      );

      const { sessionTabs } = normalize({ sessionTabs: [esqlTab, clearedTab, legacyTab] });

      expect(sessionTabs[0]).toBe(esqlTab);
      expect(sessionTabs[1].visContext).toBe(clearedTab.visContext);
      expect(sessionTabs[2].visContext).toStrictEqual(createVisContext(inlineDataViewId));
    });

    it('does not change charts that already use the derived ID', () => {
      const sessionTab = withChart(createSessionTab('tab'), inlineDataViewId);

      const first = normalize({ sessionTabs: [sessionTab] });
      const second = normalize(first);

      expect(first.sessionTabs[0].visContext).toBe(sessionTab.visContext);
      expect(second.sessionTabs).toBe(first.sessionTabs);
    });
  });
});

describe('prepareInlineDataViewLoadState', () => {
  it('prepares all updates without mutating the supplied URL and navigation state', () => {
    const navigationDataViewSpec = { ...inlineDataView, id: 'legacy-id' };
    const state = {
      urlAppState: {
        columns: ['message'],
        dataSource: createDataViewDataSource({ dataViewId: 'legacy-id' }),
        filters: [createFilter('legacy-id'), foreignFilter],
      },
      urlGlobalState: {
        filters: [
          { ...createFilter('legacy-id'), $state: { store: FilterStateStore.GLOBAL_STATE } },
        ],
      },
      initialTabState: {
        dataViewSpec: navigationDataViewSpec,
        defaultState: { filters: [createFilter('legacy-id')] },
      },
    };
    const original = cloneDeep(state);
    const prepared = prepareInlineDataViewLoadState({
      normalized: normalize({ navigationDataViewSpec }),
      selectedTab: undefined,
      ...state,
    });

    expect(prepared).toStrictEqual({
      urlAppState: {
        columns: ['message'],
        dataSource: createDataViewDataSource({ dataViewId: inlineDataViewId }),
        filters: [createFilter(inlineDataViewId), foreignFilter],
      },
      urlGlobalState: {
        filters: [
          { ...createFilter(inlineDataViewId), $state: { store: FilterStateStore.GLOBAL_STATE } },
        ],
      },
      initialTabState: {
        dataViewSpec: { ...inlineDataView, id: inlineDataViewId },
        defaultState: { filters: [createFilter(inlineDataViewId)] },
      },
      dataViewIdsToRemove: ['legacy-id'],
    });
    expect(state).toStrictEqual(original);
  });

  it('uses navigation ownership without guessing ambiguous URL or global references', () => {
    const navigationDataViewSpec = { ...editedDataView, id: 'shared-id' };
    const normalized = normalize({
      sessionTabs: [createSessionTab('tab', { ...inlineDataView, id: 'shared-id' })],
      navigationDataViewSpec,
    });
    const urlAppState = { filters: [createFilter('shared-id')] };
    const urlGlobalState = {
      filters: [{ ...createFilter('shared-id'), $state: { store: FilterStateStore.GLOBAL_STATE } }],
    };
    const prepared = prepareInlineDataViewLoadState({
      normalized,
      selectedTab: getTabStateMock({ id: 'tab' }),
      urlAppState,
      urlGlobalState,
      initialTabState: {
        dataViewSpec: navigationDataViewSpec,
        defaultState: { filters: [createFilter('shared-id')] },
      },
    });

    expect(prepared.urlAppState).toBe(urlAppState);
    expect(prepared.urlGlobalState).toBe(urlGlobalState);
    expect(prepared.initialTabState).toStrictEqual({
      dataViewSpec: { ...editedDataView, id: editedDataViewId },
      defaultState: { filters: [createFilter(editedDataViewId)] },
    });
    expect(prepared.dataViewIdsToRemove).toStrictEqual([]);
  });

  it('treats an unknown URL view of a tab whose document spec has no ID as its previous ID', () => {
    const pinnedFilter = {
      ...createFilter('legacy-id'),
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    const prepared = prepareInlineDataViewLoadState({
      normalized: normalize({
        sessionTabs: [createSessionTab('tab')],
        savedDataViewIds: ['saved-id'],
      }),
      selectedTab: getTabStateMock({ id: 'tab' }),
      urlAppState: {
        dataSource: createDataViewDataSource({ dataViewId: 'legacy-id' }),
        filters: [createFilter('legacy-id'), createFilter('unknown-id'), foreignFilter],
      },
      urlGlobalState: { filters: [pinnedFilter] },
      initialTabState: undefined,
    });

    expect(prepared).toStrictEqual({
      urlAppState: {
        dataSource: createDataViewDataSource({ dataViewId: inlineDataViewId }),
        filters: [createFilter(inlineDataViewId), createFilter('unknown-id'), foreignFilter],
      },
      urlGlobalState: { filters: [{ ...pinnedFilter, meta: { index: inlineDataViewId } }] },
      initialTabState: undefined,
      dataViewIdsToRemove: [],
    });
  });

  it('translates app state on a previous ID shared by different specs with the selected tab view', () => {
    const normalized = normalize({
      sessionTabs: [
        createSessionTab('a', { ...inlineDataView, id: 'shared-id' }, []),
        createSessionTab('b', { ...editedDataView, id: 'shared-id' }, []),
      ],
    });
    const pinnedFilter = {
      ...createFilter('shared-id'),
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    const urlGlobalState = { filters: [pinnedFilter] };
    const prepared = prepareInlineDataViewLoadState({
      normalized,
      selectedTab: getTabStateMock({ id: 'b' }),
      urlAppState: {
        dataSource: createDataViewDataSource({ dataViewId: 'shared-id' }),
        filters: [createFilter('shared-id')],
      },
      urlGlobalState,
      initialTabState: undefined,
    });

    expect(normalized.loadCompatibility.ids.shared.has('shared-id')).toBe(false);
    expect(prepared.urlAppState).toStrictEqual({
      dataSource: createDataViewDataSource({ dataViewId: editedDataViewId }),
      filters: [createFilter(editedDataViewId)],
    });
    expect(prepared.urlGlobalState).toBe(urlGlobalState);
  });

  it('does not create missing URL or navigation state', () => {
    const prepared = prepareInlineDataViewLoadState({
      normalized: normalize({}),
      selectedTab: undefined,
      urlAppState: undefined,
      urlGlobalState: undefined,
      initialTabState: undefined,
    });

    expect(prepared).toStrictEqual({
      urlAppState: undefined,
      urlGlobalState: undefined,
      initialTabState: undefined,
      dataViewIdsToRemove: [],
    });
  });
});

describe('normalizeUrlAppState', () => {
  const selectedTab = getTabStateMock({ id: 'tab' });

  it('binds unreferenced app filters to the saved view when the document spec has no ID', () => {
    const normalized = normalize({ sessionTabs: [createSessionTab('tab')] });
    const appState = { filters: [unreferencedFilter, foreignFilter] };

    expect(normalizeUrlAppState({ appState, selectedTab, normalized })).toEqual({
      filters: [createFilterWithIndex(unreferencedFilter, inlineDataViewId), foreignFilter],
    });
  });

  it('binds unreferenced app filters to the navigation view when there is one', () => {
    const normalized = normalize({
      sessionTabs: [createSessionTab('tab')],
      navigationDataViewSpec: editedDataView,
    });
    const appState = { filters: [unreferencedFilter] };

    expect(normalizeUrlAppState({ appState, selectedTab, normalized })).toEqual({
      filters: [createFilterWithIndex(unreferencedFilter, editedDataViewId)],
    });
  });

  it('binds unreferenced app filters to the view restored for the tab when the URL has none', () => {
    const localTab = createStoredTab({
      id: 'tab',
      internalState: {
        serializedSearchSource: { index: { ...editedDataView, id: 'edited-id' } },
      },
      appState: { dataSource: createDataViewDataSource({ dataViewId: 'edited-id' }) },
    });
    const normalized = normalize({ sessionTabs: [createSessionTab('tab')], openTabs: [localTab] });
    const appState = { filters: [unreferencedFilter] };

    expect(
      normalizeUrlAppState({
        appState,
        selectedTab: restoreTab(normalized.openTabs[0]),
        normalized,
      })
    ).toEqual({ filters: [createFilterWithIndex(unreferencedFilter, editedDataViewId)] });
  });

  it('does not bind filters when the URL uses another view', () => {
    const normalized = normalize({
      sessionTabs: [createSessionTab('tab')],
      savedDataViewIds: ['saved-data-view'],
    });
    const appState = {
      dataSource: createDataViewDataSource({ dataViewId: 'saved-data-view' }),
      filters: [unreferencedFilter],
    };

    expect(normalizeUrlAppState({ appState, selectedTab, normalized })).toBe(appState);
  });

  it('uses the matching local definition before a saved navigation view, as the loader does', () => {
    const localTab = createLocalTab('tab', { ...editedDataView, id: 'edited-id' });
    const normalized = normalize({
      sessionTabs: [createSessionTab('tab')],
      openTabs: [localTab],
      navigationDataViewSpec: { id: 'saved-id', title: 'saved-*' },
      savedDataViewIds: ['saved-id'],
    });
    const appState = { filters: [unreferencedFilter] };

    expect(
      normalizeUrlAppState({
        appState,
        selectedTab: restoreTab(normalized.openTabs[0]),
        normalized,
      })
    ).toStrictEqual({ filters: [createFilterWithIndex(unreferencedFilter, editedDataViewId)] });
  });

  it('does not bind filters when the document spec has an ID', () => {
    const normalized = normalize({
      sessionTabs: [createSessionTab('tab', { ...inlineDataView, id: 'saved-id' })],
    });
    const appState = { filters: [unreferencedFilter] };

    expect(normalizeUrlAppState({ appState, selectedTab, normalized })).toBe(appState);
  });
});
