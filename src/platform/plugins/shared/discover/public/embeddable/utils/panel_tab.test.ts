/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';
import { DiscoverTabType } from '@kbn/discover-session-constants';
import { FilterStateStore, type Filter, type Query } from '@kbn/es-query';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { fromDiscoverSessionTab } from './panel_tab';

const INLINE_DATA_VIEW_ID = 'inline-data-view';

const pinnedHostFilter: Filter = {
  meta: {
    index: INLINE_DATA_VIEW_ID,
    type: 'phrase',
    key: 'host.name',
    params: { query: 'web-1' },
    negate: false,
    disabled: false,
  },
  query: { match_phrase: { 'host.name': 'web-1' } },
  $state: { store: FilterStateStore.GLOBAL_STATE },
};

const createSessionTab = (overrides: Partial<DiscoverSessionTab> = {}): DiscoverSessionTab => ({
  id: 'tab-1',
  label: 'Tab 1',
  sort: [['@timestamp', 'desc']],
  columns: ['host.name', 'message'],
  grid: {},
  hideChart: false,
  hideTable: false,
  isTextBasedQuery: false,
  serializedSearchSource: {
    index: { id: INLINE_DATA_VIEW_ID, title: 'logs-*', timeFieldName: '@timestamp' },
    query: { query: 'message: error', language: 'kuery' },
    filter: [pinnedHostFilter],
  },
  ...overrides,
});

describe('fromDiscoverSessionTab', () => {
  // Old sessions can mark a Classic query as text based, so the query decides the tab type
  it.each([false, true])(
    'keeps the inline Data View ID and pinned filter conditions of a Classic tab (isTextBasedQuery: %s)',
    (isTextBasedQuery) => {
      const { id, label, tab, inlineDataViewId } = fromDiscoverSessionTab(
        createSessionTab({ isTextBasedQuery })
      );

      expect({ id, label, inlineDataViewId }).toEqual({
        id: 'tab-1',
        label: 'Tab 1',
        inlineDataViewId: INLINE_DATA_VIEW_ID,
      });
      expect(tab).toMatchObject({
        type: DiscoverTabType.Default,
        data_source: {
          type: AS_CODE_DATA_VIEW_SPEC_TYPE,
          index_pattern: 'logs-*',
          time_field: '@timestamp',
        },
        column_order: ['host.name', 'message'],
        filters: [expect.objectContaining({ data_view_id: INLINE_DATA_VIEW_ID })],
      });
    }
  );

  it.each([
    ['an Elasticsearch DSL query', { query_string: { query: 'status:500' } }],
    ['a Lucene string', 'status:500'],
  ])('reads %s saved without a language as Lucene', (_, legacyQuery) => {
    const { tab } = fromDiscoverSessionTab(
      createSessionTab({
        // Queries saved before query languages existed have no language
        serializedSearchSource: { index: 'data-view-id', query: legacyQuery as unknown as Query },
      })
    );

    expect(tab).toMatchObject({
      query: {
        language: 'lucene',
        expression: typeof legacyQuery === 'string' ? legacyQuery : JSON.stringify(legacyQuery),
      },
    });
  });

  it('leaves out the sample size of an ES|QL tab, as the session API does', () => {
    const { tab } = fromDiscoverSessionTab(
      createSessionTab({
        isTextBasedQuery: true,
        sampleSize: 100,
        serializedSearchSource: { query: { esql: 'FROM logs' } },
      })
    );

    expect(tab).not.toHaveProperty('sample_size');
  });

  it('leaves out the tab of a Classic tab saved without a Data View', () => {
    expect(fromDiscoverSessionTab(createSessionTab({ serializedSearchSource: {} }))).toEqual({
      id: 'tab-1',
      label: 'Tab 1',
    });
  });

  it('does not read the session controls, so controls that cannot be parsed do not fail the panel', () => {
    expect(() =>
      fromDiscoverSessionTab(createSessionTab({ controlGroupJson: '{not valid JSON' }))
    ).not.toThrow();
  });
});
