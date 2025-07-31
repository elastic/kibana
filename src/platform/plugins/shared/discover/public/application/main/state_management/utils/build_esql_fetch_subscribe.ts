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
import { isEqual } from 'lodash';
import type { DataDocumentsMsg, SavedSearchData } from '../discover_data_state_container';
import { FetchStatus } from '../../../types';
import type { DiscoverAppStateContainer } from '../discover_app_state_container';
import type { InternalStateStore, TabActionInjector } from '../redux';
import { internalStateActions } from '../redux';
import { getValidViewMode } from '../../utils/get_valid_view_mode';

const ESQL_MAX_NUM_OF_COLUMNS = 50;

/*
 * Takes care of ES|QL state transformations when a new result is returned
 * If necessary this is setting displayed columns and selected data view
 */
export const buildEsqlFetchSubscribe = ({
  internalState,
  appStateContainer,
  dataSubjects,
  injectCurrentTab,
}: {
  internalState: InternalStateStore;
  appStateContainer: DiscoverAppStateContainer;
  dataSubjects: SavedSearchData;
  injectCurrentTab: TabActionInjector;
}) => {
  let prevEsqlData: {
    initialFetch: boolean;
    query: string;
    allColumns: string[];
    defaultColumns: string[];
  } = {
    initialFetch: true,
    query: '',
    allColumns: [],
    defaultColumns: [],
  };

  const cleanupEsql = () => {
    if (!prevEsqlData.query) {
      return;
    }

    // cleanup when it's not an ES|QL query
    prevEsqlData = {
      initialFetch: true,
      query: '',
      allColumns: [],
      defaultColumns: [],
    };
  };

  const esqlFetchSubscribe = async (next: DataDocumentsMsg) => {
    const { query: nextQuery } = next;

    if (!nextQuery) {
      return;
    }

    if (!isOfAggregateQueryType(nextQuery)) {
      // cleanup for a "regular" query
      cleanupEsql();
      return;
    }

    // We need to reset the default profile state on index pattern changes
    // when loading starts to ensure the correct pre fetch state is available
    // before data fetching is triggered
    if (next.fetchStatus === FetchStatus.LOADING) {
      // We have to grab the current query from appState
      // here since nextQuery has not been updated yet
      const appStateQuery = appStateContainer.getState().query;

      if (isOfAggregateQueryType(appStateQuery)) {
        if (prevEsqlData.initialFetch) {
          prevEsqlData.query = appStateQuery.esql;
        }

        const indexPatternChanged =
          getIndexPatternFromESQLQuery(appStateQuery.esql) !==
          getIndexPatternFromESQLQuery(prevEsqlData.query);

        // Reset all default profile state when index pattern changes
        if (indexPatternChanged) {
          internalState.dispatch(
            injectCurrentTab(internalStateActions.setResetDefaultProfileState)({
              resetDefaultProfileState: {
                columns: true,
                rowHeight: true,
                breakdownField: true,
                hideChart: true,
              },
            })
          );
        }
      }

      return;
    }

    if (next.fetchStatus === FetchStatus.ERROR) {
      // An error occurred, but it's still considered an initial fetch
      prevEsqlData.initialFetch = false;
      return;
    }

    if (next.fetchStatus !== FetchStatus.PARTIAL) {
      return;
    }

    let nextAllColumns = prevEsqlData.allColumns;
    let nextDefaultColumns = prevEsqlData.defaultColumns;

    if (next.result?.length) {
      nextAllColumns = Object.keys(next.result[0].raw);

      if (hasTransformationalCommand(nextQuery.esql)) {
        nextDefaultColumns = nextAllColumns.slice(0, ESQL_MAX_NUM_OF_COLUMNS);
      } else {
        nextDefaultColumns = [];
      }
    }

    if (prevEsqlData.initialFetch) {
      prevEsqlData.initialFetch = false;
      prevEsqlData.query = nextQuery.esql;
      prevEsqlData.allColumns = nextAllColumns;
      prevEsqlData.defaultColumns = nextDefaultColumns;
    }

    const indexPatternChanged =
      getIndexPatternFromESQLQuery(nextQuery.esql) !==
      getIndexPatternFromESQLQuery(prevEsqlData.query);

    const allColumnsChanged = !isEqual(nextAllColumns, prevEsqlData.allColumns);

    const changeDefaultColumns =
      indexPatternChanged || !isEqual(nextDefaultColumns, prevEsqlData.defaultColumns);

    const { viewMode } = appStateContainer.getState();
    const changeViewMode = viewMode !== getValidViewMode({ viewMode, isEsqlMode: true });

    // If the index pattern hasn't changed, but the available columns have changed
    // due to transformational commands, reset the associated default profile state
    if (!indexPatternChanged && allColumnsChanged) {
      internalState.dispatch(
        injectCurrentTab(internalStateActions.setResetDefaultProfileState)({
          resetDefaultProfileState: {
            columns: true,
            rowHeight: false,
            breakdownField: false,
            hideChart: false,
          },
        })
      );
    }

    prevEsqlData.allColumns = nextAllColumns;

    if (indexPatternChanged || changeDefaultColumns || changeViewMode) {
      prevEsqlData.query = nextQuery.esql;
      prevEsqlData.defaultColumns = nextDefaultColumns;

      // just change URL state if necessary
      if (changeDefaultColumns || changeViewMode) {
        const nextState = {
          ...(changeDefaultColumns && { columns: nextDefaultColumns }),
          ...(changeViewMode && { viewMode: undefined }),
        };

        await appStateContainer.replaceUrlState(nextState);
      }
    }

    dataSubjects.documents$.next({
      ...next,
      fetchStatus: FetchStatus.COMPLETE,
    });
  };

  return { esqlFetchSubscribe, cleanupEsql };
};
