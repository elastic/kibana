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
  DiscoverSessionApiEmbeddableTab,
} from '@kbn/as-code-discover-schema';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { isOfAggregateQueryType } from '@kbn/es-query';
import {
  areComparatorsEqual,
  diffComparators,
  type StateComparators,
} from '@kbn/presentation-publishing';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { fromStoredEmbeddableTab } from '../../../common/embeddable';
import { migrateLegacyQuery } from '../../../common/migrate_legacy_query';
import { getInlineDataView } from '../../../common/session/inline_data_view';
import { toStoredSearchAndTable } from '../../../common/session/search_and_table_mapping';
import {
  omitInlineDataViewIdFromFilters,
  pinnedFiltersToAppFilters,
} from '../../../common/session/session_tab_mapping';
import { toStoredTabTypeState } from '../../../common/session/tab_type_state';
import { isDiscoverSessionEsqlTab } from '../../../common/session/type_guards';
import type { SearchEmbeddableSerializedAttributes, SearchEmbeddableSessionTab } from '../types';

type TableSettings = DiscoverSessionApiEmbeddableOverrides;

// Lists every table setting a panel can change, so a new one cannot be left out of comparisons
const TABLE_SETTING_COMPARATORS: StateComparators<TableSettings> = {
  column_order: 'deepEquality',
  column_settings: 'deepEquality',
  sort: 'deepEquality',
  density: 'referenceEquality',
  header_row_height: 'referenceEquality',
  row_height: 'referenceEquality',
  rows_per_page: 'referenceEquality',
  sample_size: 'referenceEquality',
  documents_display_mode: 'referenceEquality',
  hide_nulls: 'referenceEquality',
  wrap_lines: 'referenceEquality',
  default_rendered_nodes: 'referenceEquality',
};

// Missing column order, column settings and sort show the same table as empty ones
const TABLE_SETTING_DEFAULTS: TableSettings = { column_order: [], column_settings: {}, sort: [] };

// Changed settings with their panel values, or the empty value of a setting cleared on the panel
const getChangedTableSettings = (tab: TableSettings, tableSettings: TableSettings) =>
  diffComparators(TABLE_SETTING_COMPARATORS, tab, tableSettings, TABLE_SETTING_DEFAULTS);

/** Reads a Content Management session tab as a linked panel shows it. */
export const fromDiscoverSessionTab = (
  sessionTab: DiscoverSessionTab
): SearchEmbeddableSessionTab => {
  const { id, label, serializedSearchSource } = sessionTab;
  const query = migrateStoredQuery(serializedSearchSource.query);
  const isEsqlTab = isOfAggregateQueryType(query);

  if (!isEsqlTab && !hasDataView(serializedSearchSource.index)) {
    return { id, label };
  }

  const searchSource = { ...serializedSearchSource, ...(query && { query }) };
  // The query decides the tab type, since old sessions can mark a Classic query as text based
  const panelSearchSource = isEsqlTab ? searchSource : pinnedFiltersToAppFilters(searchSource);

  return {
    id,
    label,
    // Like the session API, an ES|QL tab has no sample size, so a panel keeps only its own one
    tab: fromStoredEmbeddableTab(
      isEsqlTab ? { ...sessionTab, sampleSize: undefined } : sessionTab,
      panelSearchSource
    ),
    inlineDataViewId: getInlineDataView(panelSearchSource)?.id,
    ...(!isEsqlTab && { filters: panelSearchSource.filter }),
  };
};

/** Converts a panel tab to the attributes the panel searches and renders with. */
export const toSearchEmbeddableAttributes = (
  tab: DiscoverSessionApiEmbeddableTab,
  inlineDataViewId?: string
): SearchEmbeddableSerializedAttributes => {
  const { serializedSearchSource, isTextBasedQuery, ...tableFields } = toStoredSearchAndTable(tab);
  const tabTypeState = toStoredTabTypeState(tab);

  return {
    ...tableFields,
    serializedSearchSource: withInlineDataViewId(serializedSearchSource, inlineDataViewId),
    ...(tabTypeState !== undefined && { tabTypeState }),
  };
};

/** Converts a session tab with a linked panel's overrides to the attributes the panel uses. */
export const toSessionTabAttributes = (
  { tab, inlineDataViewId, filters }: SearchEmbeddableSessionTab,
  overrides?: TableSettings
): SearchEmbeddableSerializedAttributes => {
  // Without a Data View, the panel shows a prompt instead of a table
  if (!tab) {
    return { serializedSearchSource: {} };
  }

  const { serializedSearchSource, ...attributes } = toSearchEmbeddableAttributes(
    applyTableSettingOverrides(tab, overrides),
    inlineDataViewId
  );

  return {
    ...attributes,
    serializedSearchSource: { ...serializedSearchSource, ...(filters && { filter: filters }) },
  };
};

/** Converts a session tab to a by-value tab, dropping filter references to its inline Data View. */
export const toByValuePanelTab = (
  tab: DiscoverSessionApiEmbeddableTab,
  inlineDataViewId?: string
): DiscoverSessionApiEmbeddableTab =>
  inlineDataViewId && !isDiscoverSessionEsqlTab(tab)
    ? { ...tab, filters: omitInlineDataViewIdFromFilters(tab.filters, inlineDataViewId) }
    : tab;

/** Applies a linked panel's overrides to its session tab, where empty column settings keep widths. */
export const applyTableSettingOverrides = <Tab extends TableSettings>(
  tab: Tab,
  overrides: TableSettings = {}
): Tab => {
  const { column_settings: columnSettings, ...otherOverrides } = overrides;

  return {
    ...tab,
    ...otherOverrides,
    ...(columnSettings &&
      Object.keys(columnSettings).length > 0 && { column_settings: columnSettings }),
  };
};

/** Returns the table settings that differ from the tab, without those cleared on the panel. */
export const getTableSettingsOverrides = (
  tab: TableSettings,
  tableSettings: TableSettings
): TableSettings =>
  // An override cannot store a cleared setting, so the tab keeps its own value
  getChangedTableSettings(tab, { ...tab, ...tableSettings });

/** Applies the panel's table settings to a tab, keeping the tab's value of each unchanged one. */
export const applyTableSettings = (
  tab: DiscoverSessionApiEmbeddableTab,
  tableSettings: TableSettings
): DiscoverSessionApiEmbeddableTab => ({ ...tab, ...getChangedTableSettings(tab, tableSettings) });

/** Compares two sets of overrides by the table they show on top of the same tab. */
export const areTableSettingOverridesEqual = (
  tab: TableSettings,
  overrides: TableSettings = {},
  otherOverrides: TableSettings = {}
): boolean =>
  areComparatorsEqual(
    TABLE_SETTING_COMPARATORS,
    applyTableSettingOverrides(tab, overrides),
    applyTableSettingOverrides(tab, otherOverrides),
    TABLE_SETTING_DEFAULTS
  );

const migrateStoredQuery = (query: SerializedSearchSourceFields['query']) => {
  // A query saved without a language is Lucene. Old queries can be strings, which the ES|QL check
  // does not accept.
  if (!query || (typeof query === 'object' && isOfAggregateQueryType(query))) {
    return query;
  }

  return migrateLegacyQuery(query);
};

// Without a Data View, a Classic tab cannot be converted to the public format
const hasDataView = (index: SerializedSearchSourceFields['index']) =>
  typeof index === 'string' ? index.length > 0 : Boolean(index?.title);

const withInlineDataViewId = (
  searchSource: SerializedSearchSourceFields,
  inlineDataViewId?: string
): SerializedSearchSourceFields => {
  const { index } = searchSource;

  return inlineDataViewId && index && typeof index === 'object'
    ? { ...searchSource, index: { ...index, id: inlineDataViewId } }
    : searchSource;
};
