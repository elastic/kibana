/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DiscoverSessionApiEmbeddableOverrides,
  DiscoverSessionApiEsqlTab,
} from '@kbn/as-code-discover-schema';
import {
  AS_CODE_DATA_VIEW_SPEC_TYPE,
  AS_CODE_ESQL_DATA_SOURCE_TYPE,
} from '@kbn/as-code-data-views-schema';
import { DataGridDensity, DiscoverTabType } from '@kbn/discover-session-constants';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionInternalData } from '../../../server/api/internal_schema';
import { fromSessionApiTab, getTableSettingsOverrides } from './panel_tab';

const INLINE_DATA_VIEW_ID = 'inline-data-view';

describe('fromSessionApiTab', () => {
  it('keeps the inline Data View ID apart and leaves out session-only settings', () => {
    const sessionTab: DiscoverSessionInternalData['tabs'][number] = {
      id: 'tab-1',
      label: 'Tab 1',
      type: DiscoverTabType.Default,
      data_source: {
        type: AS_CODE_DATA_VIEW_SPEC_TYPE,
        id: INLINE_DATA_VIEW_ID,
        index_pattern: 'logs-*',
      },
      filters: [],
      sort: [],
      view_mode: VIEW_MODE.DOCUMENT_LEVEL,
      hide_chart: false,
      hide_table: false,
    };

    expect(fromSessionApiTab(sessionTab)).toEqual({
      id: 'tab-1',
      label: 'Tab 1',
      inlineDataViewId: INLINE_DATA_VIEW_ID,
      tab: {
        type: DiscoverTabType.Default,
        data_source: { type: AS_CODE_DATA_VIEW_SPEC_TYPE, index_pattern: 'logs-*' },
        filters: [],
        sort: [],
        view_mode: VIEW_MODE.DOCUMENT_LEVEL,
      },
    });
  });

  it('leaves out session-only settings of an ES|QL tab', () => {
    const esqlSessionTab: DiscoverSessionApiEsqlTab = {
      id: 'esql-tab',
      label: 'ES|QL tab',
      type: DiscoverTabType.Default,
      data_source: { type: AS_CODE_ESQL_DATA_SOURCE_TYPE, query: 'FROM logs-*' },
      sort: [],
      hide_chart: false,
      hide_table: false,
      esql_approximation: true,
    };

    expect(fromSessionApiTab(esqlSessionTab).tab).toEqual({
      type: DiscoverTabType.Default,
      data_source: { type: AS_CODE_ESQL_DATA_SOURCE_TYPE, query: 'FROM logs-*' },
      sort: [],
    });
  });
});

describe('getTableSettingsOverrides', () => {
  it('keeps every table setting the panel changes', () => {
    // Required, so a new table setting cannot be left out of this test
    const tableSettings: Required<DiscoverSessionApiEmbeddableOverrides> = {
      column_order: ['message'],
      column_settings: { message: { width: 100 } },
      sort: [{ name: '@timestamp', direction: 'asc' }],
      density: DataGridDensity.COMPACT,
      header_row_height: 2,
      row_height: 3,
      rows_per_page: 25,
      sample_size: 100,
      documents_display_mode: 'json',
      hide_nulls: true,
      wrap_lines: false,
      default_rendered_nodes: 50,
    };

    expect(getTableSettingsOverrides({}, tableSettings)).toEqual(tableSettings);
  });
});
