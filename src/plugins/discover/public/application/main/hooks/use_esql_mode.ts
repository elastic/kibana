/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  const prev = useRef<{
    query: string;
    recentlyUpdatedToColumns: string[];
  }>({
    recentlyUpdatedToColumns: [],
    query: '',
  });
  const initialFetch = useRef<boolean>(true);
  const savedSearch = useSavedSearchInitial();

  const cleanup = useCallback(() => {
    if (prev.current.query) {
      // cleanup when it's not an ES|QL query
      prev.current = {
        recentlyUpdatedToColumns: [],
        query: '',
      };
      initialFetch.current = true;
    }
  }, []);

  useEffect(() => {
    const subscription = stateContainer.dataState.data$.documents$
      .pipe(
        switchMap(async (next) => {
          const { query } = next;
          if (!query || next.fetchStatus === FetchStatus.ERROR) {
            return;
          }

          const sendComplete = () => {
            stateContainer.dataState.data$.documents$.next({
              ...next,
              fetchStatus: FetchStatus.COMPLETE,
            });
          };

          const { viewMode } = stateContainer.appState.getState();
          const isEsqlQuery = isOfAggregateQueryType(query);

          if (isEsqlQuery) {
            const hasResults = Boolean(next.result?.length);

            if (next.fetchStatus !== FetchStatus.PARTIAL) {
              return;
            }

            let nextColumns: string[] = prev.current.recentlyUpdatedToColumns;

            if (hasResults) {
              const firstRow = next.result![0];
              const firstRowColumns = Object.keys(firstRow.raw);

              if (hasTransformationalCommand(query.esql)) {
                nextColumns = firstRowColumns.slice(0, MAX_NUM_OF_COLUMNS);
              } else {
                nextColumns = [];
              }
            }

            if (initialFetch.current) {
              initialFetch.current = false;
              prev.current.query = query.esql;
              prev.current.recentlyUpdatedToColumns = nextColumns;
            }

            const indexPatternChanged =
              getIndexPatternFromESQLQuery(query.esql) !==
              getIndexPatternFromESQLQuery(prev.current.query);

            const addColumnsToState =
              indexPatternChanged || !isEqual(nextColumns, prev.current.recentlyUpdatedToColumns);

            const changeViewMode = viewMode !== getValidViewMode({ viewMode, isEsqlMode: true });

            if (!indexPatternChanged && !addColumnsToState && !changeViewMode) {
              sendComplete();
              return;
            }

            prev.current.query = query.esql;
            prev.current.recentlyUpdatedToColumns = nextColumns;

            // just change URL state if necessary
            if (addColumnsToState || changeViewMode) {
              const nextState = {
                ...(addColumnsToState && { columns: nextColumns }),
                ...(changeViewMode && { viewMode: undefined }),
              };
              await stateContainer.appState.replaceUrlState(nextState);
            }

            sendComplete();
          } else {
            // cleanup for a "regular" query
            cleanup();
          }
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
