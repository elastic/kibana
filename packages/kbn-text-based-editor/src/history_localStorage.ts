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

const getMomentTimeZone = (timeZone?: string) => {
  return !timeZone || timeZone === 'Browser' ? moment.tz.guess() : timeZone;
};

const sortDates = (date1?: string, date2?: string) => {
  return moment(date1)?.valueOf() - moment(date2)?.valueOf();
};

export const getHistoryItems = (sortDirection: 'desc' | 'asc'): QueryHistoryItem[] => {
  const localStorageString = localStorage.getItem(QUERY_HISTORY_ITEM_KEY) ?? '[]';
  const historyItems: QueryHistoryItem[] = JSON.parse(localStorageString);
  const sortedByDate = historyItems.sort((a, b) => {
    return sortDirection === 'desc'
      ? sortDates(b?.timeRun, a?.timeRun)
      : sortDates(a?.timeRun, b?.timeRun);
  });
  return sortedByDate;
};

const cachedQueries = new Map<string, QueryHistoryItem>();
const localStorageQueries = getHistoryItems('desc');

localStorageQueries.forEach((queryItem) => {
  const trimmedQueryString = getKey(queryItem.queryString);
  cachedQueries.set(trimmedQueryString, queryItem);
});

export const addQueriesToCache = (item: QueryHistoryItem) => {
  const trimmedQueryString = getKey(item.queryString);
  if (localStorageQueries.length === MAX_QUERIES_NUMBER) {
    // delete the last element
    const toBeDeletedQuery = localStorageQueries[MAX_QUERIES_NUMBER - 1];
    cachedQueries.delete(toBeDeletedQuery.queryString);
  }
  if (item.queryString) {
    const tz = getMomentTimeZone(item.timeZone);
    cachedQueries.set(trimmedQueryString, {
      ...item,
      timeRun: moment().tz(tz).format('MMM. D, YY HH:mm:ss.SSS'),
    });
  }
};

export const updateCachedQueries = (item: QueryHistoryItem) => {
  const trimmedQueryString = getKey(item.queryString);
  const query = cachedQueries.get(trimmedQueryString);

  if (query) {
    const tz = getMomentTimeZone(query?.timeZone);
    const now = moment().tz(tz).format('MMM. D, YY HH:mm:ss.SSS');
    const duration = moment(now).diff(moment(query?.timeRun));
    cachedQueries.set(trimmedQueryString, {
      ...query,
      timeRun: moment(query?.timeRun).format('MMM. D, YY HH:mm:ss'),
      duration: `${duration}ms`,
      status: item.status,
    });
  }
  const queriesToStore = Array.from(cachedQueries, ([name, value]) => ({ ...value }));
  localStorage.setItem(QUERY_HISTORY_ITEM_KEY, JSON.stringify(queriesToStore));
};
