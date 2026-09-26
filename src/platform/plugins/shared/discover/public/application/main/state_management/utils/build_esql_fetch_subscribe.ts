/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery, hasTransformationalCommand } from '@kbn/esql-utils';
import { SOURCE_COLUMN } from '@kbn/unified-data-table';
import { isEqual } from 'lodash';
import type { DataSourceService, EsqlSource } from '@kbn/data-source';
import { unregisterFromDataViewsCache } from '@kbn/data-source';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataDocumentsMsg, SavedSearchData } from '../discover_data_state_container';
import { FetchStatus } from '../../../types';
import type { InternalStateStore, TabActionInjector, TabState } from '../redux';
import { internalStateActions } from '../redux';
import { getValidViewMode } from '../../utils/get_valid_view_mode';
import { shouldResetProfileAppStateDefaultField } from './profile_app_state_defaults';

const ESQL_MAX_NUM_OF_COLUMNS = 50;
const ESQL_TABLE_VIEW_COLUMN_THRESHOLD = 5;

/*
 * Takes care of ES|QL state transformations when a new result is returned.
 * Decides which columns to display in the grid.
 *
 * Column discovery uses EsqlSource.getColumns() — the source is resolved
 * before fetch (tab init or query change) and provides result columns from
 * LIMIT 0. This function only decides WHICH of those known columns to display.
 */
export const buildEsqlFetchSubscribe = ({
  internalState,
  dataSubjects,
  getCurrentTab,
  injectCurrentTab,
  dataSourceService,
  dataViews,
}: {
  internalState: InternalStateStore;
  dataSubjects: SavedSearchData;
  getCurrentTab: () => TabState;
  injectCurrentTab: TabActionInjector;
  dataSourceService: DataSourceService;
  dataViews: DataViewsPublicPluginStart;
}) => {
  // EsqlSource from the last completed fetch. Undefined = no successful fetch yet (initial fetch).
  // Carries .query and .getColumns() so we no longer need to track those separately.
  let prevEsqlSource: EsqlSource | undefined;
  // Default columns last written to appState — tracked to avoid redundant URL updates.
  let prevDefaultColumns: string[] = [];
  let registeredEsqlSourceId: string | undefined;

  const cleanupEsql = () => {
    if (!prevEsqlSource) {
      return;
    }

    if (registeredEsqlSourceId) {
      dataSourceService.unregisterEsqlSource(registeredEsqlSourceId);
      unregisterFromDataViewsCache(dataViews, registeredEsqlSourceId);
      registeredEsqlSourceId = undefined;
    }

    prevEsqlSource = undefined;
    prevDefaultColumns = [];
  };

  const esqlFetchSubscribe = async (next: DataDocumentsMsg) => {
    const { query: nextQuery } = next;

    if (!nextQuery) {
      return;
    }

    if (!isOfAggregateQueryType(nextQuery)) {
      cleanupEsql();
      return;
    }

    if (next.fetchStatus === FetchStatus.LOADING) {
      if (next.dataSource?.kind === 'esql') {
        registeredEsqlSourceId = next.dataSource.id;
      }

      const appStateQuery = getCurrentTab().appState.query;

      if (isOfAggregateQueryType(appStateQuery) && prevEsqlSource) {
        const indexPatternChanged =
          getIndexPatternFromESQLQuery(appStateQuery.esql) !==
          getIndexPatternFromESQLQuery(prevEsqlSource.query);

        if (indexPatternChanged) {
          internalState.dispatch(
            injectCurrentTab(internalStateActions.setProfileAppStateDefaultFieldsToReset)({
              fieldsToReset: 'all',
            })
          );
        }
      }

      return;
    }

    if (next.fetchStatus === FetchStatus.ERROR || next.fetchStatus !== FetchStatus.PARTIAL) {
      return;
    }

    // Always promote PARTIAL → COMPLETE so fetch_all and the cancel button can
    // settle. Column-default URL updates need EsqlSource; skip them if missing.
    if (next.dataSource?.kind !== 'esql') {
      dataSubjects.documents$.next({
        ...next,
        fetchStatus: FetchStatus.COMPLETE,
      });
      return;
    }

    const esqlSource = next.dataSource;
    const allColumns = esqlSource.getColumns().map((c) => c.name);

    const nextDefaultColumns =
      hasTransformationalCommand(nextQuery.esql) ||
      allColumns.length <= ESQL_TABLE_VIEW_COLUMN_THRESHOLD
        ? allColumns.slice(0, ESQL_MAX_NUM_OF_COLUMNS)
        : [];

    const isInitialFetch = prevEsqlSource === undefined;

    if (isInitialFetch) {
      const appStateColumns = getCurrentTab().appState.columns;
      const hasNoKnownAppStateColumns = appStateColumns === undefined;
      const shouldTriggerColumnsUpdate = nextDefaultColumns.length > 0 && hasNoKnownAppStateColumns;
      prevDefaultColumns = shouldTriggerColumnsUpdate ? [] : nextDefaultColumns;
    }

    // On initial fetch prevEsqlSource is undefined — compare against current query (no change).
    const prevQuery = prevEsqlSource?.query ?? nextQuery.esql;
    const indexPatternChanged =
      getIndexPatternFromESQLQuery(nextQuery.esql) !== getIndexPatternFromESQLQuery(prevQuery);

    const changeDefaultColumns =
      indexPatternChanged || !isEqual(nextDefaultColumns, prevDefaultColumns);

    const appStateColumns = getCurrentTab().appState.columns ?? [];
    const stickSource = !shouldResetProfileAppStateDefaultField(
      getCurrentTab().profileAppStateDefaults,
      'columns'
    );
    const columnsFromResponse = appStateColumns.filter((column) => allColumns.includes(column));
    const nextSelectedColumns = withStickySource(appStateColumns, columnsFromResponse, stickSource);
    const changeSelectedColumns = !isInitialFetch && !isEqual(nextSelectedColumns, appStateColumns);

    const { viewMode } = getCurrentTab().appState;
    const changeViewMode = viewMode !== getValidViewMode({ viewMode, isEsqlMode: true });

    // Commit the new source as "previous" before any async work below.
    prevEsqlSource = esqlSource;
    registeredEsqlSourceId = esqlSource.id;

    if (indexPatternChanged || changeDefaultColumns || changeSelectedColumns || changeViewMode) {
      prevDefaultColumns = nextDefaultColumns;

      if (changeDefaultColumns || changeSelectedColumns || changeViewMode) {
        let nextColumns: string[] | undefined;
        if (changeDefaultColumns) {
          nextColumns = withStickySource(appStateColumns, nextDefaultColumns, stickSource);
        } else if (changeSelectedColumns) {
          nextColumns = nextSelectedColumns;
        }

        const nextState = {
          ...(nextColumns && { columns: nextColumns }),
          ...(changeViewMode && { viewMode: undefined }),
        };

        await internalState.dispatch(
          injectCurrentTab(internalStateActions.updateAppStateAndReplaceUrl)({
            appState: nextState,
          })
        );
      }
    }

    dataSubjects.documents$.next({
      ...next,
      fetchStatus: FetchStatus.COMPLETE,
    });
  };

  return { esqlFetchSubscribe, cleanupEsql };
};

/**
 * Inserts Summary (`_source`) into the new ES|QL column list at its previous index
 * when `stickSource` is true. Does not re-insert Summary if the user turned it off.
 */
const withStickySource = (
  previousColumns: string[],
  nextColumns: string[],
  stickSource: boolean
): string[] => {
  if (!stickSource) {
    return nextColumns;
  }

  const sourceIndex = previousColumns.indexOf(SOURCE_COLUMN);
  if (sourceIndex === -1) {
    return nextColumns;
  }

  const columnsWithoutSource = nextColumns.filter((column) => column !== SOURCE_COLUMN);
  const insertAt = Math.min(sourceIndex, columnsWithoutSource.length);
  return [
    ...columnsWithoutSource.slice(0, insertAt),
    SOURCE_COLUMN,
    ...columnsWithoutSource.slice(insertAt),
  ];
};
