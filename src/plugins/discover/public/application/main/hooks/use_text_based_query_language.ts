/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { isEqual } from 'lodash';
import {
  isOfAggregateQueryType,
  getIndexPatternFromSQLQuery,
  AggregateQuery,
  Query,
} from '@kbn/es-query';
import { useCallback, useEffect, useRef } from 'react';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { VIEW_MODE } from '@kbn/saved-search-plugin/public';
import { useSavedSearchInitial } from '../services/discover_state_provider';
import type { DiscoverStateContainer } from '../services/discover_state';
import { getValidViewMode } from '../utils/get_valid_view_mode';
import { FetchStatus } from '../../types';

const MAX_NUM_OF_COLUMNS = 50;

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
  const prev = useRef<{ query: AggregateQuery | Query | undefined; columns: string[] }>({
    columns: [],
    query: undefined,
  });
  const savedSearch = useSavedSearchInitial();

  const cleanup = useCallback(() => {
    if (prev.current.query) {
      // cleanup when it's not a text based query lang
      prev.current = {
        columns: [],
        query: undefined,
      };
    }
  }, []);

  useEffect(() => {
    const subscription = stateContainer.dataState.data$.documents$.subscribe(async (next) => {
      const { query, recordRawType } = next;
      if (!query || next.fetchStatus === FetchStatus.ERROR) {
        return;
      }
      const { columns: stateColumns, index, viewMode } = stateContainer.appState.getState();
      let nextColumns: string[] = [];
      const isTextBasedQueryLang =
        recordRawType === 'plain' && isOfAggregateQueryType(query) && 'sql' in query;
      const hasResults = next.result?.length && next.fetchStatus === FetchStatus.COMPLETE;
      const initialFetch = !prev.current.columns.length;

      if (isTextBasedQueryLang) {
        if (hasResults) {
          // check if state needs to contain column transformation due to a different columns in the resultset
          const firstRow = next.result![0];
          const firstRowColumns = Object.keys(firstRow.raw).slice(0, MAX_NUM_OF_COLUMNS);
          if (
            !isEqual(firstRowColumns, prev.current.columns) &&
            !isEqual(query, prev.current.query)
          ) {
            prev.current = { columns: firstRowColumns, query };
            nextColumns = firstRowColumns;
          }

          if (firstRowColumns && initialFetch) {
            prev.current = { columns: firstRowColumns, query };
          }
        }
        const indexPatternFromQuery = getIndexPatternFromSQLQuery(query.sql);
        const internalState = stateContainer.internalState.getState();
        const dataViewList = [...internalState.savedDataViews, ...internalState.adHocDataViews];
        let dataViewObj = dataViewList.find(({ title }) => title === indexPatternFromQuery);

        // no dataview found but the index pattern is valid
        // create an adhoc instance instead
        if (!dataViewObj) {
          dataViewObj = await dataViews.create({
            title: indexPatternFromQuery,
          });
          stateContainer.internalState.transitions.setAdHocDataViews([dataViewObj]);

          if (dataViewObj.fields.getByName('@timestamp')?.type === 'date') {
            dataViewObj.timeFieldName = '@timestamp';
          } else if (dataViewObj.fields.getByType('date')?.length) {
            const dateFields = dataViewObj.fields.getByType('date');
            dataViewObj.timeFieldName = dateFields[0].name;
          }
        }

        // don't set the columns on initial fetch, to prevent overwriting existing state
        const addColumnsToState = Boolean(
          nextColumns.length && (!initialFetch || !stateColumns?.length)
        );
        // no need to reset index to state if it hasn't changed
        const addDataViewToState = Boolean(dataViewObj.id !== index);
        if (!addColumnsToState && !addDataViewToState) {
          return;
        }

        const nextState = {
          ...(addDataViewToState && { index: dataViewObj.id }),
          ...(addColumnsToState && { columns: nextColumns }),
          ...(viewMode === VIEW_MODE.AGGREGATED_LEVEL && {
            viewMode: getValidViewMode({ viewMode, isTextBasedQueryMode: true }),
          }),
        };
        stateContainer.appState.replaceUrlState(nextState);
      } else {
        // cleanup for a "regular" query
        cleanup();
      }
    });
    return () => {
      // cleanup for e.g. when savedSearch is switched
      cleanup();
      subscription.unsubscribe();
    };
  }, [dataViews, stateContainer, savedSearch, cleanup]);
}
