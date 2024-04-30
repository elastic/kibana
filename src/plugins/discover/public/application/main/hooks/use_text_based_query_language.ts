/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { isEqual } from 'lodash';
import { isOfAggregateQueryType, getAggregateQueryMode } from '@kbn/es-query';
import { useCallback, useEffect, useRef } from 'react';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { switchMap } from 'rxjs';
import { useSavedSearchInitial } from '../services/discover_state_provider';
import type { DiscoverStateContainer } from '../services/discover_state';
import { getValidViewMode } from '../utils/get_valid_view_mode';
import { FetchStatus } from '../../types';

const MAX_NUM_OF_COLUMNS = 50;
// For ES|QL we want in case of the following commands to display a table view, otherwise display a document view
const TRANSFORMATIONAL_COMMANDS = ['stats', 'keep'];

/**
 * Hook to take care of text based query language state transformations when a new result is returned
 * If necessary this is setting displayed columns and selected data view
 */
export function useTextBasedQueryLanguage({
  dataViews,
  stateContainer,
}: {
  stateContainer: DiscoverStateContainer;
  dataViews: DataViewsContract;
}) {
  const prev = useRef<{
    query: string;
    columns: string[];
  }>({
    columns: [],
    query: '',
  });
  const initialFetch = useRef<boolean>(true);
  const savedSearch = useSavedSearchInitial();

  const cleanup = useCallback(() => {
    if (prev.current.query) {
      // cleanup when it's not a text based query lang
      prev.current = {
        columns: [],
        query: '',
      };
    }
  }, []);

  useEffect(() => {
    const subscription = stateContainer.dataState.data$.documents$
      .pipe(
        switchMap(async (next) => {
          const { query, recordRawType } = next;
          if (!query || next.fetchStatus === FetchStatus.ERROR) {
            return;
          }
          const sendComplete = () => {
            stateContainer.dataState.data$.documents$.next({
              ...next,
              fetchStatus: FetchStatus.COMPLETE,
            });
          };
          const { index, viewMode } = stateContainer.appState.getState();
          let nextColumns: string[] = [];
          const isTextBasedQueryLang =
            recordRawType === 'plain' &&
            isOfAggregateQueryType(query) &&
            ('sql' in query || 'esql' in query);
          const hasResults = Boolean(next.result?.length);
          let queryHasTransformationalCommands = 'sql' in query;
          if ('esql' in query) {
            TRANSFORMATIONAL_COMMANDS.forEach((command: string) => {
              if (query.esql.toLowerCase().includes(command)) {
                queryHasTransformationalCommands = true;
                return;
              }
            });
          }

          if (isTextBasedQueryLang) {
            const language = getAggregateQueryMode(query);
            if (next.fetchStatus !== FetchStatus.PARTIAL) {
              return;
            }
            const dataViewObj = stateContainer.internalState.getState().dataView;

            if (hasResults) {
              // check if state needs to contain column transformation due to a different columns in the resultset
              const firstRow = next.result![0];
              const firstRowColumns = Object.keys(firstRow.raw).slice(0, MAX_NUM_OF_COLUMNS);
              if (!queryHasTransformationalCommands) {
                nextColumns = [];
                initialFetch.current = false;
              } else {
                nextColumns = firstRowColumns;
                if (
                  initialFetch.current &&
                  !prev.current.columns.length &&
                  Boolean(dataViewObj?.id === index)
                ) {
                  prev.current.columns = firstRowColumns;
                }
              }
            }
            const addColumnsToState = !isEqual(nextColumns, prev.current.columns);
            const queryChanged = query[language] !== prev.current.query;
            // no need to reset index to state if it hasn't changed
            const addDataViewToState = index !== undefined;
            const changeViewMode =
              viewMode !== getValidViewMode({ viewMode, isTextBasedQueryMode: true });
            if (!queryChanged || (!addDataViewToState && !addColumnsToState && !changeViewMode)) {
              sendComplete();
              return;
            }

            if (queryChanged) {
              prev.current.query = query[language];
              prev.current.columns = nextColumns;
            }
            // just change URL state if necessary
            if (addDataViewToState || addColumnsToState || changeViewMode) {
              const nextState = {
                ...(addDataViewToState && { index: undefined }),
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
