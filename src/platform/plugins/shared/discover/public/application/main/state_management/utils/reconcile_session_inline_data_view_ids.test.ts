/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { cloneDeep } from 'lodash';
import { createDataViewDataSource } from '../../../../../common/data_sources';
import { generateInlineDataViewId } from '../../../../../common/session/inline_data_view';
import { getTabStateMock } from '../redux/__mocks__/internal_state.mocks';
import type { TabState } from '../redux/types';
import { reconcileSessionInlineDataViewIds } from './reconcile_session_inline_data_view_ids';

const inlineDataView: DataViewSpec = {
  title: 'logs-*',
  name: 'Inline logs',
  timeFieldName: '@timestamp',
  sourceFilters: [{ value: 'secret.*' }],
};

const createInlineTab = (
  id: string,
  dataView: DataViewSpec = inlineDataView
): DiscoverSessionTab => ({
  id,
  label: id,
  sort: [],
  columns: [],
  grid: {},
  hideChart: true,
  hideTable: false,
  isTextBasedQuery: false,
  usesAdHocDataView: true,
  serializedSearchSource: {
    index: { ...dataView },
    filter: [
      { meta: {}, query: { match_all: {} } },
      {
        meta: { index: 'foreign-data-view-id' },
        query: { term: { 'service.name': 'api' } },
      },
    ],
  },
});

const createLocalTab = ({
  id,
  dataView,
  filterDataViewId = dataView.id,
}: {
  id: string;
  dataView: DataViewSpec;
  filterDataViewId?: string;
}): TabState => {
  const filters = [
    {
      meta: { index: filterDataViewId },
      query: { match_phrase: { 'service.name': 'checkout' } },
    },
  ];
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
    globalState: { filters: cloneDeep(filters) },
  });
};

const createVisContext = (dataViewId: string) => ({
  suggestionType: 'histogramForDataView',
  requestData: { dataViewId },
  attributes: {
    references: [
      { type: 'index-pattern', id: dataViewId, name: 'current-layer' },
      { type: 'index-pattern', id: 'foreign-data-view-id', name: 'foreign-layer' },
    ],
    state: {
      filters: [{ meta: { index: dataViewId } }, { meta: { index: 'foreign-data-view-id' } }],
      datasourceStates: {
        formBased: {
          layers: {
            current: { indexPatternId: dataViewId },
            foreign: { indexPatternId: 'foreign-data-view-id' },
          },
        },
      },
    },
  },
});

describe('reconcileSessionInlineDataViewIds', () => {
  it('assigns the deterministic document identity without mutating the input', () => {
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [createInlineTab('inline-a'), createInlineTab('inline-b')],
    });
    const originalSession = cloneDeep(session);

    const result = reconcileSessionInlineDataViewIds({ session, localTabs: [] });
    const dataViewId = generateInlineDataViewId(inlineDataView);

    expect(result.session.tabs).toMatchObject([
      {
        serializedSearchSource: {
          index: { id: dataViewId },
          filter: [{ meta: { index: dataViewId } }, { meta: { index: 'foreign-data-view-id' } }],
        },
      },
      {
        serializedSearchSource: {
          index: { id: dataViewId },
          filter: [{ meta: { index: dataViewId } }, { meta: { index: 'foreign-data-view-id' } }],
        },
      },
    ]);
    expect(result.selectedTabReplacement).toMatchObject({
      fromId: undefined,
      toId: dataViewId,
    });
    expect(session).toStrictEqual(originalSession);
  });

  it('preserves distinct persisted IDs even when their definitions match', () => {
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [
        createInlineTab('inline-a', { ...inlineDataView, id: 'legacy-a' }),
        createInlineTab('inline-b', { ...inlineDataView, id: 'legacy-b' }),
      ],
    });

    const result = reconcileSessionInlineDataViewIds({ session, localTabs: [] });

    expect(result.session.tabs).toMatchObject([
      { serializedSearchSource: { index: { id: 'legacy-a' } } },
      { serializedSearchSource: { index: { id: 'legacy-b' } } },
    ]);
  });

  it('reconciles an equivalent local identity without inspecting visContext', () => {
    const localDataView = { ...inlineDataView, id: 'local-inline-id', version: 'local-version' };
    const localTab = createLocalTab({ id: 'inline-a', dataView: localDataView });
    const visContext = createVisContext(localDataView.id);
    localTab.attributes.visContext = cloneDeep(visContext) as TabState['attributes']['visContext'];
    localTab.overriddenVisContextAfterInvalidation = cloneDeep(
      visContext
    ) as TabState['overriddenVisContextAfterInvalidation'];
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [createInlineTab('inline-a')],
    });
    session.tabs[0].visContext = cloneDeep(visContext) as DiscoverSessionTab['visContext'];
    const targetId = generateInlineDataViewId(inlineDataView);

    const result = reconcileSessionInlineDataViewIds({
      session,
      localTabs: [localTab],
      navigation: { tabId: 'inline-a', dataViewSpec: localDataView },
    });

    expect(result.session.tabs[0].serializedSearchSource.index).toMatchObject({ id: targetId });
    expect(result.navigationDataViewSpec).toEqual({ ...localDataView, id: targetId });
    expect(result.selectedTabReplacement).toMatchObject({
      fromId: 'local-inline-id',
      toId: targetId,
    });
    expect(result.localTabs[0]).toMatchObject({
      initialInternalState: {
        serializedSearchSource: {
          index: { ...localDataView, id: targetId },
          filter: [{ meta: { index: targetId } }],
        },
      },
      appState: {
        dataSource: createDataViewDataSource({ dataViewId: targetId }),
        filters: [{ meta: { index: targetId } }],
      },
      previousAppState: {
        dataSource: createDataViewDataSource({ dataViewId: targetId }),
        filters: [{ meta: { index: targetId } }],
      },
      globalState: { filters: [{ meta: { index: targetId } }] },
      attributes: {
        visContext: {
          requestData: { dataViewId: 'local-inline-id' },
          attributes: {
            references: [{ id: 'local-inline-id' }, { id: 'foreign-data-view-id' }],
            state: {
              filters: [
                { meta: { index: 'local-inline-id' } },
                { meta: { index: 'foreign-data-view-id' } },
              ],
              datasourceStates: {
                formBased: {
                  layers: {
                    current: { indexPatternId: 'local-inline-id' },
                    foreign: { indexPatternId: 'foreign-data-view-id' },
                  },
                },
              },
            },
          },
        },
      },
      overriddenVisContextAfterInvalidation: {
        requestData: { dataViewId: 'local-inline-id' },
      },
    });
    expect(result.session.tabs[0].visContext).toMatchObject({
      requestData: { dataViewId: 'local-inline-id' },
      attributes: {
        references: [{ id: 'local-inline-id' }, { id: 'foreign-data-view-id' }],
      },
    });
  });

  it('binds only search source filters and leaves app state and visContext unreferenced', () => {
    const localDataView = { ...inlineDataView, id: 'local-inline-id' };
    const localTab = createLocalTab({ id: 'inline-a', dataView: localDataView });
    const unreferencedFilter = {
      meta: {},
      query: { match_phrase: { 'service.name': 'checkout' } },
    };
    localTab.initialInternalState = {
      ...localTab.initialInternalState,
      serializedSearchSource: {
        ...localTab.initialInternalState?.serializedSearchSource,
        index: localDataView,
        filter: [cloneDeep(unreferencedFilter)],
      },
    };
    localTab.appState.filters = [cloneDeep(unreferencedFilter)];
    localTab.previousAppState.filters = [cloneDeep(unreferencedFilter)];
    localTab.globalState.filters = [cloneDeep(unreferencedFilter)];

    const visContext = {
      suggestionType: 'histogramForDataView',
      requestData: { timeField: '@timestamp' },
      attributes: { visualizationType: 'lnsXY', state: { filters: [unreferencedFilter] } },
    };
    localTab.attributes.visContext = visContext as TabState['attributes']['visContext'];
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [createInlineTab('inline-a')],
    });
    session.tabs[0].visContext = visContext as DiscoverSessionTab['visContext'];

    const result = reconcileSessionInlineDataViewIds({ session, localTabs: [localTab] });
    const targetId = generateInlineDataViewId(inlineDataView);

    expect(result.session.tabs[0].serializedSearchSource.filter?.[0].meta.index).toBe(targetId);
    expect(
      result.localTabs[0].initialInternalState?.serializedSearchSource?.filter?.[0].meta.index
    ).toBe(targetId);
    expect(result.localTabs[0].appState.filters?.[0].meta.index).toBeUndefined();
    expect(result.localTabs[0].previousAppState.filters?.[0].meta.index).toBeUndefined();
    expect(result.localTabs[0].globalState.filters?.[0].meta.index).toBeUndefined();
    expect(result.session.tabs[0].visContext).toBe(visContext);
    expect(result.localTabs[0].attributes.visContext).toBe(visContext);
    expect(visContext.requestData).not.toHaveProperty('dataViewId');
  });

  it('leaves a real local definition change untouched and therefore dirty', () => {
    const changedDataView = { ...inlineDataView, id: 'edited-inline-id', title: 'other-logs-*' };
    const localTab = createLocalTab({ id: 'inline-a', dataView: changedDataView });
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [createInlineTab('inline-a')],
    });

    const result = reconcileSessionInlineDataViewIds({
      session,
      localTabs: [localTab],
      navigation: { tabId: 'inline-a', dataViewSpec: changedDataView },
    });

    expect(result.session.tabs[0].serializedSearchSource.index).toMatchObject({
      id: generateInlineDataViewId(inlineDataView),
      title: inlineDataView.title,
    });
    expect(result.localTabs[0]).toBe(localTab);
    expect(result.navigationDataViewSpec).toBe(changedDataView);
    expect(result.selectedTabReplacement).toBeUndefined();

    const withoutNavigation = reconcileSessionInlineDataViewIds({
      session,
      localTabs: [localTab],
    });
    expect(withoutNavigation.selectedTabReplacement).toBeUndefined();
  });

  it('updates a duplicated local tab when its alias has one unambiguous target', () => {
    const localDataView = { ...inlineDataView, id: 'local-inline-id' };
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [createInlineTab('inline-a')],
    });
    const localTabs = [
      createLocalTab({ id: 'inline-a', dataView: localDataView }),
      createLocalTab({ id: 'duplicate-tab', dataView: localDataView }),
    ];
    const targetId = generateInlineDataViewId(inlineDataView);

    const result = reconcileSessionInlineDataViewIds({
      session,
      localTabs,
      navigation: { tabId: 'duplicate-tab', dataViewSpec: localDataView },
    });

    expect(result.localTabs).toMatchObject([
      { initialInternalState: { serializedSearchSource: { index: { id: targetId } } } },
      { initialInternalState: { serializedSearchSource: { index: { id: targetId } } } },
    ]);
    expect(result.localTabs[1].globalState.filters?.[0].meta.index).toBe(targetId);
    expect(result.navigationDataViewSpec).toEqual({ ...localDataView, id: targetId });
    expect(result.selectedTabReplacement).toMatchObject({
      fromId: 'local-inline-id',
      toId: targetId,
    });
  });

  it('does not guess an identity for an unmatched tab when one alias has multiple targets', () => {
    const localDataView = { ...inlineDataView, id: 'shared-local-id' };
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [
        createInlineTab('inline-a', { ...inlineDataView, id: 'legacy-a' }),
        createInlineTab('inline-b', { ...inlineDataView, id: 'legacy-b' }),
      ],
    });
    const duplicate = createLocalTab({ id: 'duplicate-tab', dataView: localDataView });

    const result = reconcileSessionInlineDataViewIds({
      session,
      localTabs: [
        createLocalTab({ id: 'inline-a', dataView: localDataView }),
        createLocalTab({ id: 'inline-b', dataView: localDataView }),
        duplicate,
      ],
    });

    expect(result.localTabs).toMatchObject([
      { initialInternalState: { serializedSearchSource: { index: { id: 'legacy-a' } } } },
      { initialInternalState: { serializedSearchSource: { index: { id: 'legacy-b' } } } },
      { initialInternalState: { serializedSearchSource: { index: { id: 'shared-local-id' } } } },
    ]);
  });

  it('is idempotent across document, local and navigation state', () => {
    const localDataView = { ...inlineDataView, id: 'local-inline-id' };
    const first = reconcileSessionInlineDataViewIds({
      session: createDiscoverSessionMock({
        id: 'session-id',
        tabs: [createInlineTab('inline-a')],
      }),
      localTabs: [createLocalTab({ id: 'inline-a', dataView: localDataView })],
      navigation: { tabId: 'inline-a', dataViewSpec: localDataView },
    });

    const second = reconcileSessionInlineDataViewIds({
      session: first.session,
      localTabs: first.localTabs,
      navigation: { tabId: 'inline-a', dataViewSpec: first.navigationDataViewSpec },
    });

    expect(second.session).toStrictEqual(first.session);
    expect(second.localTabs).toStrictEqual(first.localTabs);
    expect(second.navigationDataViewSpec).toStrictEqual(first.navigationDataViewSpec);
  });

  it('ignores saved Data View references and ES|QL state', () => {
    const referencedTab = createInlineTab('referenced');
    referencedTab.usesAdHocDataView = false;
    referencedTab.serializedSearchSource = { index: 'saved-data-view' };
    const esqlTab = createInlineTab('esql');
    esqlTab.isTextBasedQuery = true;
    esqlTab.serializedSearchSource.query = { esql: 'FROM logs-*' };
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [referencedTab, esqlTab],
    });

    const result = reconcileSessionInlineDataViewIds({ session, localTabs: [] });

    expect(result.session).toStrictEqual(session);
  });
});
