/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import 'moment-timezone';
const QUERY_HISTORY_ITEM_KEY = 'QUERY_HISTORY_ITEM_KEY';
export const dateFormat = 'MMM. D, YY HH:mm:ss';

/**
 * We show maximum 20 ES|QL queries in the Query history component
 */

export interface QueryHistoryItem {
  status?: 'success' | 'error' | 'warning';
  queryString: string;
  timeRan?: string;
}

export const MAX_HISTORY_QUERIES_NUMBER = 20;

export const getTrimmedQuery = (queryString: string) => {
  return queryString.replaceAll('\n', '').trim().replace(/\s\s+/g, ' ');
};

const sortDates = (date1?: string, date2?: string) => {
  if (!date1 || !date2) return 0;
  return date1 < date2 ? 1 : date1 > date2 ? -1 : 0;
};

export const getHistoryItems = (sortDirection: 'desc' | 'asc'): QueryHistoryItem[] => {
  const localStorageString = localStorage.getItem(QUERY_HISTORY_ITEM_KEY) ?? '[]';
  const localStorageItems: QueryHistoryItem[] = JSON.parse(localStorageString);
  const historyItems: QueryHistoryItem[] = localStorageItems.map((item) => {
    return {
      status: item.status,
      queryString: item.queryString,
      timeRan: item.timeRan ? new Date(item.timeRan).toISOString() : undefined,
    };
  });

  const sortedByDate = historyItems.sort((a, b) => {
    return sortDirection === 'desc'
      ? sortDates(b.timeRan, a.timeRan)
      : sortDates(a.timeRan, b.timeRan);
  });
  return sortedByDate;
};

const cachedQueries = new Map<string, QueryHistoryItem>();

export const getCachedQueries = (): QueryHistoryItem[] => {
  return Array.from(cachedQueries, ([name, value]) => ({ ...value }));
};

// Adding the maxQueriesAllowed here for testing purposes
export const addQueriesToCache = (
  item: QueryHistoryItem,
  maxQueriesAllowed = MAX_HISTORY_QUERIES_NUMBER
) => {
  // if the user is working on multiple tabs
  // the cachedQueries Map might not contain all
  // the localStorage queries
  const queries = getHistoryItems('desc');
  queries.forEach((queryItem) => {
    const trimmedQueryString = getTrimmedQuery(queryItem.queryString);
    cachedQueries.set(trimmedQueryString, queryItem);
  });
  const trimmedQueryString = getTrimmedQuery(item.queryString);

  if (item.queryString) {
    cachedQueries.set(trimmedQueryString, {
      ...item,
      timeRan: new Date().toISOString(),
      status: item.status,
    });
  }

  let allQueries = [...getCachedQueries()];

  if (allQueries.length >= maxQueriesAllowed + 1) {
    const sortedByDate = allQueries.sort((a, b) => sortDates(b.timeRan, a.timeRan));

    // queries to store in the localstorage
    allQueries = sortedByDate.slice(0, maxQueriesAllowed);
    // clear and reset the queries in the cache
    cachedQueries.clear();
    allQueries.forEach((queryItem) => {
      cachedQueries.set(queryItem.queryString, queryItem);
    });
  }
  localStorage.setItem(QUERY_HISTORY_ITEM_KEY, JSON.stringify(allQueries));
};
