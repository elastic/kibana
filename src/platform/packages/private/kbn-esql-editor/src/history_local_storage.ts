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
 * We store ES|QL queries in history based on storage size rather than a fixed count.
 * This allows for more queries when they're shorter, fewer when they're longer.
 */

export interface QueryHistoryItem {
  status?: 'success' | 'error' | 'warning';
  queryString: string;
  timeRan?: string;
}

const MAX_STORAGE_SIZE_KB = 50; // 50KB storage limit

export const getTrimmedQuery = (queryString: string) => {
  return queryString.replaceAll('\n', '').trim().replace(/\s\s+/g, ' ');
};

const sortDates = (date1?: string, date2?: string) => {
  if (!date1 || !date2) return 0;
  return date1 < date2 ? -1 : date1 > date2 ? 1 : 0;
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

/**
 * Get current storage usage statistics for debugging/monitoring
 */
export const getStorageStats = () => {
  const queries = getHistoryItems('desc');
  const storageString = JSON.stringify(queries);
  const storageSizeKB = new Blob([storageString]).size / 1024;

  return {
    queryCount: queries.length,
    storageSizeKB: parseFloat(storageSizeKB.toFixed(2)),
    maxStorageLimitKB: MAX_STORAGE_SIZE_KB,
    storageUsagePercent: parseFloat(
      Math.round((storageSizeKB / MAX_STORAGE_SIZE_KB) * 100).toFixed(2)
    ), // Round to 2 decimals
  };
};

// Adding the maxQueriesAllowed here for testing purposes
export const addQueriesToCache = (itemToAddOrUpdate: QueryHistoryItem) => {
  // if the user is working on multiple tabs
  // the cachedQueries Map might not contain all
  // the localStorage queries
  const queries = getHistoryItems('desc');
  cachedQueries.clear();
  queries.forEach((queryItem) => {
    const trimmedQueryString = getTrimmedQuery(queryItem.queryString);
    cachedQueries.set(trimmedQueryString, queryItem);
  });
  const trimmedQueryString = getTrimmedQuery(itemToAddOrUpdate.queryString);

  if (itemToAddOrUpdate.queryString) {
    cachedQueries.set(trimmedQueryString, {
      ...itemToAddOrUpdate,
      timeRan: new Date().toISOString(),
    });
  }

  let allQueries = [...getCachedQueries()];

  const getStorageSizeKB = (queryList: QueryHistoryItem[]) =>
    new Blob([JSON.stringify(queryList)]).size / 1024;

  // Apply storage-based trimming (sort once, then trim iteratively)
  allQueries = allQueries.sort((a, b) => sortDates(b.timeRan, a.timeRan));
  while (getStorageSizeKB(allQueries) > MAX_STORAGE_SIZE_KB && allQueries.length > 10) {
    allQueries.pop();
  }

  // Update cache with final query list
  cachedQueries.clear();
  allQueries.forEach((queryItem) => {
    const queryKey = getTrimmedQuery(queryItem.queryString);
    cachedQueries.set(queryKey, queryItem);
  });

  localStorage.setItem(QUERY_HISTORY_ITEM_KEY, JSON.stringify(allQueries));
};
