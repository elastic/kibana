/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { hasTransformationalCommand, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { useCallback, useEffect, useRef } from 'react';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { switchMap } from 'rxjs';
import { useSavedSearchInitial } from '../state_management/discover_state_provider';
import type { DiscoverStateContainer } from '../state_management/discover_state';
import { getValidViewMode } from '../utils/get_valid_view_mode';
import { FetchStatus } from '../../types';

const MAX_NUM_OF_COLUMNS = 50;

/**
 * Hook to take care of ES|QL state transformations when a new result is returned
 * If necessary this is setting displayed columns and selected data view
 */
export function useEsqlMode({
  dataViews,
  stateContainer,
}: {
  stateContainer: DiscoverStateContainer;
  dataViews: DataViewsContract;
}) {
  const savedSearch = useSavedSearchInitial();
  const prev = useRef<{
    initialFetch: boolean;
    query: string;
    allColumns: string[];
    defaultColumns: string[];
  }>({
    initialFetch: true,
    query: '',
    allColumns: [],
    defaultColumns: [],
  });

  const cleanup = useCallback(() => {
    if (!prev.current.query) {
      return;
    }

    // cleanup when it's not an ES|QL query
    prev.current = {
      initialFetch: true,
      query: '',
      allColumns: [],
      defaultColumns: [],
    };
  }, []);

  useEffect(() => {
    const subscription = stateContainer.dataState.data$.documents$
      .pipe(
        switchMap(async (next) => {
          const { query: nextQuery } = next;

          if (!nextQuery || next.fetchStatus === FetchStatus.ERROR) {
            return;
          }

          if (!isOfAggregateQueryType(nextQuery)) {
            // cleanup for a "regular" query
            cleanup();
            return;
          }

          // We need to reset the default profile state on index pattern changes
          // when loading starts to ensure the correct pre fetch state is available
          // before data fetching is triggered
          if (next.fetchStatus === FetchStatus.LOADING) {
            // We have to grab the current query from appState
            // here since nextQuery has not been updated yet
            const appStateQuery = stateContainer.appState.getState().query;

            if (isOfAggregateQueryType(appStateQuery)) {
              if (prev.current.initialFetch) {
                prev.current.query = appStateQuery.esql;
              }

              const indexPatternChanged =
                getIndexPatternFromESQLQuery(appStateQuery.esql) !==
                getIndexPatternFromESQLQuery(prev.current.query);

              // Reset all default profile state when index pattern changes
              if (indexPatternChanged) {
                stateContainer.internalState.transitions.setResetDefaultProfileState({
                  columns: true,
                  rowHeight: true,
                  breakdownField: true,
                });
              }
            }

            return;
          }

          if (next.fetchStatus !== FetchStatus.PARTIAL) {
            return;
          }

          let nextAllColumns = prev.current.allColumns;
          let nextDefaultColumns = prev.current.defaultColumns;

          if (next.result?.length) {
            nextAllColumns = Object.keys(next.result[0].raw);

            if (hasTransformationalCommand(nextQuery.esql)) {
              nextDefaultColumns = nextAllColumns.slice(0, MAX_NUM_OF_COLUMNS);
            } else {
              nextDefaultColumns = [];
            }
          }

          if (prev.current.initialFetch) {
            prev.current.initialFetch = false;
            prev.current.query = nextQuery.esql;
            prev.current.allColumns = nextAllColumns;
            prev.current.defaultColumns = nextDefaultColumns;
          }

          const indexPatternChanged =
            getIndexPatternFromESQLQuery(nextQuery.esql) !==
            getIndexPatternFromESQLQuery(prev.current.query);

          const allColumnsChanged = !isEqual(nextAllColumns, prev.current.allColumns);

          const changeDefaultColumns =
            indexPatternChanged || !isEqual(nextDefaultColumns, prev.current.defaultColumns);

          const { viewMode } = stateContainer.appState.getState();
          const changeViewMode = viewMode !== getValidViewMode({ viewMode, isEsqlMode: true });

          // If the index pattern hasn't changed, but the available columns have changed
          // due to transformational commands, reset the associated default profile state
          if (!indexPatternChanged && allColumnsChanged) {
            stateContainer.internalState.transitions.setResetDefaultProfileState({
              columns: true,
              rowHeight: false,
              breakdownField: false,
            });
          }

          prev.current.allColumns = nextAllColumns;

          if (indexPatternChanged || changeDefaultColumns || changeViewMode) {
            prev.current.query = nextQuery.esql;
            prev.current.defaultColumns = nextDefaultColumns;

            // just change URL state if necessary
            if (changeDefaultColumns || changeViewMode) {
              const nextState = {
                ...(changeDefaultColumns && { columns: nextDefaultColumns }),
                ...(changeViewMode && { viewMode: undefined }),
              };

              await stateContainer.appState.replaceUrlState(nextState);
            }
          }

          stateContainer.dataState.data$.documents$.next({
            ...next,
            fetchStatus: FetchStatus.COMPLETE,
          });
        })
      )
      .subscribe();

    return () => {
      // cleanup for e.g. when savedSearch is switched
      cleanup();
      subscription.unsubscribe();
    };
  }, [dataViews, stateContainer, savedSearch, cleanup]);
}
