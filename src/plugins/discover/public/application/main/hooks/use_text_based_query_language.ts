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
import { useEffect, useRef } from 'react';
import { DataViewListItem, DataViewsContract } from '@kbn/data-views-plugin/public';
import type { GetStateReturn } from '../services/discover_state';
import type { DataDocuments$ } from './use_saved_search';
import { FetchStatus } from '../../types';

const MAX_NUM_OF_COLUMNS = 50;

/**
 * Hook to take care of text based query language state transformations when a new result is returned
 * If necessary this is setting displayed columns and selected data view
 */
export function useTextBasedQueryLanguage({
  documents$,
  dataViews,
  stateContainer,
  dataViewList,
}: {
  documents$: DataDocuments$;
  stateContainer: GetStateReturn;
  dataViews: DataViewsContract;
  dataViewList: DataViewListItem[];
}) {
  const prev = useRef<{ query: AggregateQuery | Query | undefined; columns: string[] }>({
    columns: [],
    query: undefined,
  });

  useEffect(() => {
    const subscription = documents$.subscribe(async (next) => {
      const { query } = next;
      let nextColumns: string[] = [];
      const isTextBasedQueryLang =
        next.recordRawType === 'plain' && query && isOfAggregateQueryType(query) && 'sql' in query;
      const hasResults = next.result?.length && next.fetchStatus === FetchStatus.COMPLETE;

      if (isTextBasedQueryLang) {
        if (hasResults) {
          // check if state needs to contain column transformation due to a different columns in the resultset
          const firstRow = next.result![0];
          const firstRowColumns = Object.keys(firstRow.raw).slice(0, MAX_NUM_OF_COLUMNS);
          if (
            !isEqual(firstRowColumns, prev.current.columns) &&
            !isEqual(query, prev.current.query)
          ) {
            nextColumns = firstRowColumns;
            prev.current = { columns: nextColumns, query };
          }
        }
        const indexPatternFromQuery = getIndexPatternFromSQLQuery(query.sql);
        const dataViewObj = dataViewList.find(({ title }) => title === indexPatternFromQuery);

        if (dataViewObj) {
          const nextState = {
            index: dataViewObj.id,
            ...(nextColumns.length && { columns: nextColumns }),
          };
          stateContainer.replaceUrlAppState(nextState);
        }
      } else {
        if (prev.current.query) {
          // cleanup when it's not a text based query lang
          prev.current = {
            columns: [],
            query: undefined,
          };
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [documents$, dataViews, stateContainer, dataViewList]);
}
