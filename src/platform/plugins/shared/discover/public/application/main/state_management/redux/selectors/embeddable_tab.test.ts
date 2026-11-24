/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AS_CODE_DATA_VIEW_REFERENCE_TYPE,
  AS_CODE_ESQL_DATA_SOURCE_TYPE,
} from '@kbn/as-code-data-views-schema';
import { discoverSessionApiEmbeddableByValueConfigSchema } from '@kbn/as-code-discover-schema';
import { DiscoverTabType } from '@kbn/discover-session-constants';
import type { Query } from '@kbn/es-query';
import { toSavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { dataViewWithTimefieldMock } from '../../../../../__mocks__/data_view_with_timefield';
import { DataSourceType } from '../../../../../../common/data_sources';
import { fromStoredSearchEmbeddableByValue } from '../../../../../../common/embeddable';
import { getPersistedTabMock, getTabStateMock } from '../__mocks__/internal_state.mocks';
import { selectTabEmbeddableTab } from './embeddable_tab';
import { selectTabSavedSearch } from './saved_search';

const ESQL_QUERY = 'FROM logs | KEEP message';

const setup = async () => {
  const services = createDiscoverServicesMock();
  const { internalState, runtimeStateManager, initializeTabs, initializeSingleTab, addNewTab } =
    getDiscoverInternalStateMock({
      services,
      persistedDataViews: [dataViewWithTimefieldMock],
    });
  const persistedTab = getPersistedTabMock({
    tabId: 'classic-tab',
    dataView: dataViewWithTimefieldMock,
    appStateOverrides: {
      columns: ['message', 'extension'],
      query: { query: 'extension: jpg', language: 'kuery' },
      sort: [['timestamp', 'desc']],
      rowHeight: 3,
    },
    services,
  });

  await initializeTabs({
    persistedDiscoverSession: createDiscoverSessionMock({
      id: 'test-session-id',
      title: 'Test Session',
      tabs: [persistedTab],
    }),
  });
  await initializeSingleTab({ tabId: persistedTab.id });

  await addNewTab({
    tab: getTabStateMock({
      id: 'esql-tab',
      initialInternalState: {
        serializedSearchSource: {
          index: dataViewWithTimefieldMock.id,
          query: { esql: ESQL_QUERY },
        },
      },
      appState: {
        columns: ['message'],
        query: { esql: ESQL_QUERY },
        dataSource: { type: DataSourceType.Esql },
      },
    }),
  });

  return { getState: internalState.getState, runtimeStateManager, services, addNewTab };
};

/** Derives the panel tab from the legacy saved search by-value payload. */
const getPanelTabFromSavedSearchPayload = async (
  params: Parameters<typeof selectTabSavedSearch>[0]
) => {
  const savedSearch = await selectTabSavedSearch(params);
  const { searchSourceJSON, references } = savedSearch.searchSource.serialize();
  const attributes = toSavedSearchAttributes(savedSearch, searchSourceJSON);
  const {
    tabs: [tab],
  } = fromStoredSearchEmbeddableByValue({ attributes: { ...attributes, references } }, references);

  return tab;
};

describe('selectTabEmbeddableTab', () => {
  it('builds a public by-value panel tab from a classic tab', async () => {
    const { getState, runtimeStateManager, services } = await setup();

    const tab = selectTabEmbeddableTab({
      tabId: 'classic-tab',
      getState,
      runtimeStateManager,
      services,
    });

    expect(tab).toMatchObject({
      type: DiscoverTabType.Default,
      data_source: {
        type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
        ref_id: dataViewWithTimefieldMock.id,
      },
      column_order: ['message', 'extension'],
      sort: [{ name: 'timestamp', direction: 'desc' }],
      row_height: 3,
    });
    expect(() =>
      discoverSessionApiEmbeddableByValueConfigSchema.parse({ tabs: [tab] })
    ).not.toThrow();
  });

  it('builds a public by-value panel tab from an ES|QL tab', async () => {
    const { getState, runtimeStateManager, services } = await setup();

    const tab = selectTabEmbeddableTab({
      tabId: 'esql-tab',
      getState,
      runtimeStateManager,
      services,
    });

    expect(tab).toMatchObject({
      type: DiscoverTabType.Default,
      data_source: { type: AS_CODE_ESQL_DATA_SOURCE_TYPE, query: ESQL_QUERY },
      column_order: ['message'],
    });
    expect(tab).not.toHaveProperty('filters');
    expect(tab).not.toHaveProperty('view_mode');
    expect(() =>
      discoverSessionApiEmbeddableByValueConfigSchema.parse({ tabs: [tab] })
    ).not.toThrow();
  });

  it('transfers a legacy query without a language as Lucene', async () => {
    const { getState, runtimeStateManager, services, addNewTab } = await setup();
    // Queries saved before query languages existed are Elasticsearch DSL without a language
    const legacyQuery = { query_string: { query: 'status:500' } } as unknown as Query;

    await addNewTab({
      tab: getTabStateMock({
        id: 'legacy-query-tab',
        initialInternalState: {
          serializedSearchSource: { index: dataViewWithTimefieldMock.id, query: legacyQuery },
        },
      }),
    });

    const tab = selectTabEmbeddableTab({
      tabId: 'legacy-query-tab',
      getState,
      runtimeStateManager,
      services,
    });

    expect(tab).toMatchObject({
      query: { language: 'lucene', expression: JSON.stringify(legacyQuery) },
    });
  });

  it.each(['classic-tab', 'esql-tab'])(
    'matches the panel tab derived from the saved search payload for %s',
    async (tabId) => {
      const { getState, runtimeStateManager, services } = await setup();
      const params = { tabId, getState, runtimeStateManager, services };

      expect(selectTabEmbeddableTab(params)).toEqual(
        await getPanelTabFromSavedSearchPayload(params)
      );
    }
  );
});
