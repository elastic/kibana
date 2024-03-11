/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment from 'moment';
const QUERY_HISTORY_ITEM_KEY = 'QUERY_HISTORY_ITEM_KEY';

export interface QueryHistoryItem {
  status?: 'success' | 'error';
  queryString: string;
  timeRun?: string;
  timeZone?: string;
  duration?: string;
}

export const getHistoryItems = (): QueryHistoryItem[] => {
  const localStorageString = localStorage.getItem(QUERY_HISTORY_ITEM_KEY) ?? '[]';
  const historyItems: QueryHistoryItem[] = JSON.parse(localStorageString);
  return historyItems;
};

const cachedQueries = new Map<string, QueryHistoryItem>();
const localStorageQueries = getHistoryItems();
localStorageQueries.forEach((queryItem) => {
  const trimmedQueryString = queryItem.queryString.replaceAll('\n', '').trim();
  cachedQueries.set(trimmedQueryString, queryItem);
});

export const addQueriesToCache = (item: QueryHistoryItem) => {
  const trimmedQueryString = item.queryString.replaceAll('\n', '').trim();
  if (!localStorageQueries.some((queryItem) => queryItem.queryString === trimmedQueryString)) {
    cachedQueries.set(item.queryString, item);
  }
};

export const updateCachedQueries = (item: QueryHistoryItem) => {
  const query = cachedQueries.get(item.queryString);
  const tz = !item.timeZone || item.timeZone === 'Browser' ? moment.tz.guess() : item.timeZone;
  if (query) {
    cachedQueries.set(item.queryString, {
      ...item,
      timeRun: moment().tz(tz).format('MMM. d, YY HH:mm:ss'),
    });
  }
  const queriesToStore = Array.from(cachedQueries, ([name, value]) => ({ ...value }));
  localStorage.setItem(QUERY_HISTORY_ITEM_KEY, JSON.stringify(queriesToStore));
};
