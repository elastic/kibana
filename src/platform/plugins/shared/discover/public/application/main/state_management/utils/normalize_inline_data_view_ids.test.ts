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
import type { TabState } from '../redux/types';
import {
  normalizeInlineDataViewIds,
  normalizeUrlAppState,
  translateAppStateDataViewIds,
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

const createLocalTab = (id: string, dataView: DataViewSpec): TabState => {
  const filters = [createFilter(dataView.id), foreignFilter];
  const dataSource = dataView.id
    ? createDataViewDataSource({ dataViewId: dataView.id })
    : undefined;

  return getTabStateMock({
    id,
    initialInternalState: {
      serializedSearchSource: { index: dataView, filter: cloneDeep(filters) },
    },
    appState: { dataSource, filters: cloneDeep(filters) },
    previousAppState: { dataSource, filters: cloneDeep(filters) },
    globalState: { filters: [] },
  });
};

const normalize = ({
  sessionTabs = [],
  openTabs = [],
  closedTabs = [],
  defaultTabState,
  openTabsFromSession = true,
  navigationDataViewSpec,
  savedDataViewIds = [],
}: Partial<Parameters<typeof normalizeInlineDataViewIds>[0]>) =>
  normalizeInlineDataViewIds({
    sessionTabs,
    openTabs,
    closedTabs,
    defaultTabState,
    openTabsFromSession,
    navigationDataViewSpec,
    savedDataViewIds,
  });

describe('normalizeInlineDataViewIds', () => {
  it('includes the default tab in the shared map without resolving ambiguous pinned references', () => {
    const defaultTabState = createLocalTab('default', { ...inlineDataView, id: 'legacy-id' });
    const pinnedFilter: Filter = {
      ...createFilter('legacy-id'),
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    defaultTabState.globalState = { filters: [pinnedFilter] };
    const closedTab = {
      ...createLocalTab('closed', { ...editedDataView, id: 'legacy-id' }),
      closedAt: 1,
    };

    const normalized = normalize({ defaultTabState, closedTabs: [closedTab] });

    expect(normalized.defaultTabState).toMatchObject({
      initialInternalState: { serializedSearchSource: { index: { id: inlineDataViewId } } },
      appState: { dataSource: createDataViewDataSource({ dataViewId: inlineDataViewId }) },
      globalState: { filters: [pinnedFilter] },
    });
    expect(normalized.closedTabs[0]).toMatchObject({
      closedAt: 1,
      initialInternalState: { serializedSearchSource: { index: { id: editedDataViewId } } },
      appState: { dataSource: createDataViewDataSource({ dataViewId: editedDataViewId }) },
    });
    expect(normalized.dataViewIdMap.has('legacy-id')).toBe(false);
  });

  it('assigns the spec ID to API tabs and binds their unreferenced filters', () => {
    const sessionTabs = [createSessionTab('api-a'), createSessionTab('api-b')];

    const { sessionTabs: normalizedTabs, dataViewIdMap } = normalize({ sessionTabs });

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
    expect(dataViewIdMap.size).toBe(0);
  });

  it('gives independent views with the same spec the same identity', () => {
    const { sessionTabs, dataViewIdMap } = normalize({
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
    expect(Object.fromEntries(dataViewIdMap)).toEqual({
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
      initialInternalState: {
        serializedSearchSource: {
          index: { ...editedDataView, id: editedDataViewId },
          filter: [createFilter(editedDataViewId), foreignFilter],
        },
      },
      appState: {
        dataSource: createDataViewDataSource({ dataViewId: editedDataViewId }),
        filters: [createFilter(editedDataViewId), foreignFilter],
      },
      previousAppState: {
        dataSource: createDataViewDataSource({ dataViewId: editedDataViewId }),
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

    expect(openTabs[0].globalState.filters).toEqual([
      { ...pinnedFilter, meta: { index: inlineDataViewId } },
      unreferencedPinnedFilter,
    ]);
  });

  it('keeps pinned filters on a previous ID shared by different specs', () => {
    const pinnedFilter: Filter = {
      ...createFilter('shared-id'),
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    const createTab = (id: string, dataView: DataViewSpec): TabState => ({
      ...createLocalTab(id, { ...dataView, id: 'shared-id' }),
      initialInternalState: {
        serializedSearchSource: {
          index: { ...dataView, id: 'shared-id' },
          filter: [pinnedFilter, createFilter('shared-id')],
        },
      },
      globalState: { filters: [pinnedFilter] },
    });
    const expectedTab = (dataViewId: string) => ({
      initialInternalState: {
        serializedSearchSource: {
          index: { id: dataViewId },
          filter: [pinnedFilter, createFilter(dataViewId)],
        },
      },
      appState: { filters: [createFilter(dataViewId), foreignFilter] },
      globalState: { filters: [pinnedFilter] },
    });

    const { openTabs, dataViewIdMap } = normalize({
      openTabs: [createTab('logs', inlineDataView), createTab('edited', editedDataView)],
    });

    expect(dataViewIdMap.has('shared-id')).toBe(false);
    expect(openTabs).toMatchObject([expectedTab(inlineDataViewId), expectedTab(editedDataViewId)]);
  });

  it('does not bind unreferenced pinned filters of a spec without an ID', () => {
    const unreferencedPinnedFilter = {
      ...unreferencedFilter,
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    const filters = [unreferencedPinnedFilter, unreferencedFilter];
    const localTab = getTabStateMock({
      id: 'local',
      initialInternalState: {
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
    expect(openTabs[0].initialInternalState?.serializedSearchSource?.filter).toEqual(
      expectedFilters
    );
  });

  it('binds unreferenced app filters of a local tab whose document spec has no ID', () => {
    const pinnedFilter = {
      ...unreferencedFilter,
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    const dataSource = createDataViewDataSource({ dataViewId: inlineDataViewId });
    const localTab = getTabStateMock({
      id: 'tab',
      initialInternalState: {
        serializedSearchSource: {
          index: { ...inlineDataView, id: inlineDataViewId },
          filter: [pinnedFilter, unreferencedFilter, foreignFilter],
        },
      },
      appState: { dataSource, filters: [unreferencedFilter, foreignFilter] },
      previousAppState: { dataSource, filters: [unreferencedFilter] },
      globalState: { filters: [pinnedFilter] },
    });

    const { openTabs } = normalize({
      sessionTabs: [createSessionTab('tab')],
      openTabs: [localTab],
    });
    const [normalizedTab] = openTabs;
    const boundFilter = createFilterWithIndex(unreferencedFilter, inlineDataViewId);

    expect(normalizedTab.initialInternalState?.serializedSearchSource?.filter).toEqual([
      pinnedFilter,
      boundFilter,
      foreignFilter,
    ]);
    expect(normalizedTab.appState.filters).toEqual([boundFilter, foreignFilter]);
    expect(normalizedTab.previousAppState.filters).toEqual([boundFilter]);
    expect(normalizedTab.globalState.filters).toEqual([pinnedFilter]);
  });

  it('applies the document convention only to open tabs stored for the same session', () => {
    const localTab = getTabStateMock({
      id: 'tab',
      initialInternalState: {
        serializedSearchSource: {
          index: { ...inlineDataView, id: inlineDataViewId },
          filter: [unreferencedFilter],
        },
      },
      appState: {
        dataSource: createDataViewDataSource({ dataViewId: inlineDataViewId }),
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

    expect(sameSession.openTabs[0].appState.filters).toEqual([
      createFilterWithIndex(unreferencedFilter, inlineDataViewId),
    ]);
    expect(sameSession.closedTabs[0]).toBe(closedTab);
    expect(otherSession.openTabs[0]).toBe(localTab);
    expect(otherSession.closedTabs[0]).toBe(closedTab);
  });

  it('binds unreferenced app filters of a local edit to its own view', () => {
    const localTab = getTabStateMock({
      id: 'tab',
      initialInternalState: {
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
    expect(openTabs[0].initialInternalState?.serializedSearchSource).toEqual({
      index: { ...editedDataView, id: editedDataViewId },
      filter: [boundFilter],
    });
    expect(openTabs[0].appState).toEqual({
      dataSource: createDataViewDataSource({ dataViewId: editedDataViewId }),
      filters: [boundFilter],
    });
  });

  it('keeps unreferenced filters when the document spec has an ID', () => {
    const localTab = getTabStateMock({
      id: 'tab',
      initialInternalState: {
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
    expect(openTabs[0].initialInternalState?.serializedSearchSource?.filter).toEqual([
      unreferencedFilter,
    ]);
    expect(openTabs[0].appState.filters).toEqual([unreferencedFilter]);
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
    const { sessionTabs, openTabs, dataViewIdMap } = normalize({
      sessionTabs: [
        createSessionTab('saved', { ...inlineDataView, id: 'shared-id' }, [
          createFilter('shared-id'),
        ]),
      ],
      openTabs: [createLocalTab('local', { ...editedDataView, id: 'shared-id' })],
    });

    expect(dataViewIdMap.has('shared-id')).toBe(false);
    expect(sessionTabs[0].serializedSearchSource).toEqual({
      index: { ...inlineDataView, id: inlineDataViewId },
      filter: [createFilter(inlineDataViewId)],
    });
    expect(openTabs[0].initialInternalState?.serializedSearchSource).toEqual({
      index: { ...editedDataView, id: editedDataViewId },
      filter: [createFilter(editedDataViewId), foreignFilter],
    });
  });

  it('normalizes the navigation spec and translates references to its previous ID', () => {
    const { navigationDataViewSpec, navigationIdMap, dataViewIdMap } = normalize({
      navigationDataViewSpec: { ...inlineDataView, id: 'link-id' },
    });

    expect(navigationDataViewSpec).toEqual({ ...inlineDataView, id: inlineDataViewId });
    expect(navigationIdMap.get('link-id')).toBe(inlineDataViewId);
    expect(dataViewIdMap.get('link-id')).toBe(inlineDataViewId);
  });

  it('leaves excluded views unchanged in session and local tabs', () => {
    const sessionTabs = [
      createSessionTab('profile', { ...inlineDataView, id: 'profile-id', managed: true }),
    ];
    const esqlTab = getTabStateMock({
      id: 'esql',
      initialInternalState: {
        serializedSearchSource: {
          index: { ...inlineDataView, id: 'esql-id' },
          query: { esql: 'FROM logs-*' },
        },
      },
    });

    const normalized = normalize({ sessionTabs, openTabs: [esqlTab] });

    expect(normalized.sessionTabs).toBe(sessionTabs);
    expect(normalized.openTabs[0]).toBe(esqlTab);
    expect(normalized.dataViewIdMap.size).toBe(0);
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
    expect(second.dataViewIdMap.size).toBe(0);
    expect(input).toStrictEqual(originalInput);
  });
});

describe('translateAppStateDataViewIds', () => {
  const idMap = new Map([['legacy-id', inlineDataViewId]]);

  it('translates the data source and filters without changing other app state', () => {
    const appState = {
      columns: ['message'],
      dataSource: createDataViewDataSource({ dataViewId: 'legacy-id' }),
      filters: [createFilter('legacy-id'), foreignFilter],
    };

    expect(translateAppStateDataViewIds(appState, idMap)).toEqual({
      columns: ['message'],
      dataSource: createDataViewDataSource({ dataViewId: inlineDataViewId }),
      filters: [createFilter(inlineDataViewId), foreignFilter],
    });
  });

  it('returns the same app state when nothing refers to a translated ID', () => {
    const appState = {
      dataSource: createDataViewDataSource({ dataViewId: 'saved-data-view' }),
      filters: [foreignFilter],
    };

    expect(translateAppStateDataViewIds(appState, idMap)).toBe(appState);
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
    const localTab = getTabStateMock({
      id: 'tab',
      initialInternalState: {
        serializedSearchSource: { index: { ...editedDataView, id: 'edited-id' } },
      },
      appState: { dataSource: createDataViewDataSource({ dataViewId: 'edited-id' }) },
    });
    const normalized = normalize({ sessionTabs: [createSessionTab('tab')], openTabs: [localTab] });
    const appState = { filters: [unreferencedFilter] };

    expect(
      normalizeUrlAppState({ appState, selectedTab: normalized.openTabs[0], normalized })
    ).toEqual({ filters: [createFilterWithIndex(unreferencedFilter, editedDataViewId)] });
  });

  it('does not bind filters when the URL uses another view', () => {
    const normalized = normalize({ sessionTabs: [createSessionTab('tab')] });
    const appState = {
      dataSource: createDataViewDataSource({ dataViewId: 'saved-data-view' }),
      filters: [unreferencedFilter],
    };

    expect(normalizeUrlAppState({ appState, selectedTab, normalized })).toBe(appState);
  });

  it('does not bind filters when the document spec has an ID', () => {
    const normalized = normalize({
      sessionTabs: [createSessionTab('tab', { ...inlineDataView, id: 'saved-id' })],
    });
    const appState = { filters: [unreferencedFilter] };

    expect(normalizeUrlAppState({ appState, selectedTab, normalized })).toBe(appState);
  });
});
