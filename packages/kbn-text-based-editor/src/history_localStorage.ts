/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment from 'moment';
const QUERY_HISTORY_ITEM_KEY = 'QUERY_HISTORY_ITEM_KEY';

/**
 * We show maximum 20 ES|QL queries in the Query history component
 */

export interface QueryHistoryItem {
  status?: 'success' | 'error';
  queryString: string;
  timeRun?: string;
  timeZone?: string;
  duration?: string;
}

const MAX_QUERIES_NUMBER = 20;

const getKey = (queryString: string) => {
  return queryString.replaceAll('\n', '').trim();
};

export const getHistoryItems = (): QueryHistoryItem[] => {
  const localStorageString = localStorage.getItem(QUERY_HISTORY_ITEM_KEY) ?? '[]';
  const historyItems: QueryHistoryItem[] = JSON.parse(localStorageString);
  return historyItems;
};

const cachedQueries = new Map<string, QueryHistoryItem>();
const localStorageQueries = getHistoryItems();

localStorageQueries.forEach((queryItem) => {
  const trimmedQueryString = getKey(queryItem.queryString);
  cachedQueries.set(trimmedQueryString, queryItem);
});

export const addQueriesToCache = (item: QueryHistoryItem) => {
  const trimmedQueryString = getKey(item.queryString);
  if (!localStorageQueries.some((queryItem) => queryItem.queryString === trimmedQueryString)) {
    cachedQueries.set(item.queryString, item);
    if (localStorageQueries.length === MAX_QUERIES_NUMBER) {
      // delete from map and local storage
    }
  }
};

export const updateCachedQueries = (item: QueryHistoryItem) => {
  const trimmedQueryString = getKey(item.queryString);
  const query = cachedQueries.get(trimmedQueryString);
  const tz = !item.timeZone || item.timeZone === 'Browser' ? moment.tz.guess() : item.timeZone;
  if (query) {
    cachedQueries.set(trimmedQueryString, {
      ...item,
      timeRun: moment().tz(tz).format('MMM. d, YY HH:mm:ss'),
    });
  }
  const queriesToStore = Array.from(cachedQueries, ([name, value]) => ({ ...value }));
  localStorage.setItem(QUERY_HISTORY_ITEM_KEY, JSON.stringify(queriesToStore));
};
