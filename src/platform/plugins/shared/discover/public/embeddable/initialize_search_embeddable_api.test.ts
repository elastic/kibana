/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSessionApiEmbeddableTab } from '@kbn/as-code-discover-schema';
import { createSearchSource } from '@kbn/data-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { VIEW_MODE } from '@kbn/discover-session-constants';
import { FILTERS, FilterStateStore } from '@kbn/es-query';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { cloneDeep } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { generateInlineDataViewId } from '../../common/session/inline_data_view';
import { createFilter, foreignFilter } from '../../common/session/inline_data_view.fixtures';
import { toStoredSearchAndTable } from '../../common/session/search_and_table_mapping';
import { createDataViewsCacheMock } from '../__mocks__/data_views';
import { createDiscoverServicesMock } from '../__mocks__/services';
import { initializeSearchEmbeddableApi } from './initialize_search_embeddable_api';
import type { SearchEmbeddableSerializedAttributes } from './types';
import { deserializeState, serializeState } from './utils/serialization_utils';

const inlineSpec: DataViewSpec = { title: 'logs-*', timeFieldName: '@timestamp' };
const inlineId = generateInlineDataViewId(inlineSpec);

describe('initializeSearchEmbeddableApi inline views', () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
  });

  const setup = () => {
    const services = createDiscoverServicesMock();
    const { create, clearInstanceCache } = createDataViewsCacheMock();
    Object.assign(services.dataViews, { create, clearInstanceCache });
    services.data.search.searchSource.create = jest.fn(
      createSearchSource(services.dataViews, {
        aggs: services.data.search.aggs,
        search: services.data.search.search,
        getConfig: services.uiSettings.get,
        onResponse: (_request, response) => response,
        scriptedFieldsEnabled: true,
        dataViews: services.dataViews,
      })
    );

    const initialize = async (initialState: SearchEmbeddableSerializedAttributes) => {
      const embeddable = await initializeSearchEmbeddableApi({
        initialState,
        discoverServices: services,
        dataLoading$: new BehaviorSubject<boolean | undefined>(false),
      });
      cleanups.push(embeddable.cleanup);

      return embeddable;
    };

    return { services, initialize, clearInstanceCache };
  };

  it('loads a legacy by-reference tab and shares its view with an equivalent panel', async () => {
    const { services, initialize, clearInstanceCache } = setup();
    const pinnedFilter = {
      ...createFilter('legacy-id'),
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    const session = createDiscoverSessionMock({
      id: 'session-id',
      tabs: [
        {
          id: 'tab-id',
          label: 'Logs',
          sort: [],
          columns: [],
          grid: {},
          hideChart: false,
          hideTable: false,
          isTextBasedQuery: false,
          serializedSearchSource: {
            index: { ...inlineSpec, id: 'legacy-id' },
            filter: [createFilter('legacy-id'), foreignFilter, pinnedFilter],
          },
        },
      ],
    });
    const originalSession = cloneDeep(session);
    jest.mocked(services.savedSearch.getDiscoverSession).mockResolvedValue(session);

    const state = await deserializeState({
      serializedState: { ref_id: session.id, selected_tab_id: 'tab-id', overrides: {} },
      discoverServices: services,
    });
    const first = await initialize(state);
    const second = await initialize({
      serializedSearchSource: { index: { ...inlineSpec, id: 'independent-legacy-id' } },
    });
    const sharedView = await services.inlineDataViews.resolve(inlineSpec);

    expect(first.api.dataViews$.getValue()?.[0]).toBe(sharedView);
    expect(second.api.dataViews$.getValue()?.[0]).toBe(sharedView);
    expect(sharedView.id).toBe(inlineId);
    expect(first.api.filters$.getValue()).toStrictEqual([
      createFilter(inlineId),
      foreignFilter,
      pinnedFilter,
    ]);
    expect(session).toStrictEqual(originalSession);
    expect(clearInstanceCache).not.toHaveBeenCalled();
  });

  it('normalizes a tab switch and restores the original instance from a snapshot', async () => {
    const { initialize, clearInstanceCache } = setup();
    const first = await initialize({
      serializedSearchSource: {
        index: { ...inlineSpec, id: 'legacy-id' },
        filter: [createFilter('legacy-id')],
      },
    });
    const originalView = first.api.dataViews$.getValue()?.[0];
    const snapshot = first.api.savedSearch$.getValue().searchSource.getSerializedFields();
    const otherSpec = { ...inlineSpec, title: 'other-logs-*', id: 'legacy-id' };
    const otherId = generateInlineDataViewId(otherSpec);

    await first.reinitializeState({
      serializedSearchSource: { index: otherSpec, filter: [createFilter('legacy-id')] },
    });

    expect(first.api.dataViews$.getValue()?.[0].id).toBe(otherId);
    expect(first.api.filters$.getValue()).toStrictEqual([createFilter(otherId)]);
    expect(first.api.savedSearch$.getValue().searchSource.getField('index')?.id).toBe(otherId);

    await first.reinitializeState({ serializedSearchSource: snapshot });

    expect(first.api.dataViews$.getValue()?.[0]).toBe(originalView);
    expect(first.api.filters$.getValue()).toStrictEqual([createFilter(inlineId)]);
    expect(clearInstanceCache).not.toHaveBeenCalled();
  });

  it('binds an ID-less by-value filter at runtime and serializes it implicitly again', async () => {
    const { initialize } = setup();
    const tab: DiscoverSessionApiEmbeddableTab = {
      type: 'default',
      sort: [],
      view_mode: VIEW_MODE.DOCUMENT_LEVEL,
      data_source: {
        type: 'data_view_spec',
        index_pattern: 'logs-*',
        name: 'logs-*',
        time_field: '@timestamp',
        allow_hidden_indices: false,
      },
      filters: [
        {
          type: 'condition',
          condition: { field: 'service.name', operator: 'is', value: 'api' },
        },
        {
          type: 'condition',
          data_view_id: 'foreign-view',
          condition: { field: 'bytes', operator: 'exists' },
        },
      ],
    };
    const initialState = toStoredSearchAndTable(tab);
    const embeddable = await initialize(initialState);

    expect(embeddable.api.dataViews$.getValue()?.[0].id).toBe(inlineId);
    expect(embeddable.api.filters$.getValue()).toStrictEqual([
      expect.objectContaining({ meta: expect.objectContaining({ index: inlineId }) }),
      expect.objectContaining({
        meta: expect.objectContaining({ index: 'foreign-view', type: FILTERS.EXISTS }),
      }),
    ]);
    expect(
      serializeState({
        uuid: 'panel-id',
        initialState,
        savedSearch: embeddable.api.savedSearch$.getValue(),
        serializeTitles: () => ({}),
        serializeTimeRange: () => ({}),
        serializeDynamicActions: () => ({}),
      })
    ).toStrictEqual(
      expect.objectContaining({
        tabs: [expect.objectContaining({ data_source: tab.data_source, filters: tab.filters })],
      })
    );
  });
});
