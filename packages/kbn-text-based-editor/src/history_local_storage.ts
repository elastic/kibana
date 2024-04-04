/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment from 'moment';
import 'moment-timezone';
const QUERY_HISTORY_ITEM_KEY = 'QUERY_HISTORY_ITEM_KEY';
const dateFormat = 'MMM. D, YY HH:mm:ss.SSS';

/**
 * We show maximum 20 ES|QL queries in the Query history component
 */

export interface QueryHistoryItem {
  status?: 'success' | 'error' | 'warning';
  queryString: string;
  startDateMilliseconds?: number;
  timeRan?: string;
  timeZone?: string;
  duration?: string;
  queryRunning?: boolean;
}

const MAX_QUERIES_NUMBER = 20;

const getKey = (queryString: string) => {
  return queryString.replaceAll('\n', '').trim();
};

const getMomentTimeZone = (timeZone?: string) => {
  return !timeZone || timeZone === 'Browser' ? moment.tz.guess() : timeZone;
};

const sortDates = (date1?: number, date2?: number) => {
  return moment(date1)?.valueOf() - moment(date2)?.valueOf();
};

export const getHistoryItems = (sortDirection: 'desc' | 'asc'): QueryHistoryItem[] => {
  const localStorageString = localStorage.getItem(QUERY_HISTORY_ITEM_KEY) ?? '[]';
  const historyItems: QueryHistoryItem[] = JSON.parse(localStorageString);
  const sortedByDate = historyItems.sort((a, b) => {
    return sortDirection === 'desc'
      ? sortDates(b.startDateMilliseconds, a.startDateMilliseconds)
      : sortDates(a.startDateMilliseconds, b.startDateMilliseconds);
  });
  return sortedByDate;
};

const cachedQueries = new Map<string, QueryHistoryItem>();

export const getCachedQueries = (): QueryHistoryItem[] => {
  return Array.from(cachedQueries, ([name, value]) => ({ ...value }));
};

export const addQueriesToCache = (item: QueryHistoryItem) => {
  const queries = getHistoryItems('desc');
  queries.forEach((queryItem) => {
    const trimmedQueryString = getKey(queryItem.queryString);
    cachedQueries.set(trimmedQueryString, queryItem);
  });
  const trimmedQueryString = getKey(item.queryString);

  if (item.queryString) {
    const tz = getMomentTimeZone(item.timeZone);
    cachedQueries.set(trimmedQueryString, {
      ...item,
      timeRan: moment().tz(tz).format(dateFormat),
      startDateMilliseconds: moment().valueOf(),
      queryRunning: true,
    });
  }
};

export const updateCachedQueries = (item: QueryHistoryItem) => {
  const trimmedQueryString = getKey(item.queryString);
  const query = cachedQueries.get(trimmedQueryString);

  if (query) {
    const now = moment().valueOf();
    const duration = moment(now).diff(moment(query?.startDateMilliseconds));
    cachedQueries.set(trimmedQueryString, {
      ...query,
      timeRan: query.queryRunning ? query.timeRan : moment().format('MMM. D, YY HH:mm:ss'),
      duration: query.queryRunning ? `${duration}ms` : query.duration,
      status: item.status,
      queryRunning: false,
    });
  }
  const queriesToStore = getCachedQueries();
  const localStorageQueries = getHistoryItems('desc');
  // if the user is working on multiple tabs
  // the cachedQueries Map might not contain all
  // the localStorage queries
  const newQueries = localStorageQueries.filter(
    (ls) => !queriesToStore.find((cachedQuery) => cachedQuery.queryString === ls.queryString)
  );
  let allQueries = [...queriesToStore, ...newQueries];

  if (allQueries.length === MAX_QUERIES_NUMBER + 1) {
    const sortedByDate = allQueries.sort((a, b) =>
      sortDates(b?.startDateMilliseconds, a?.startDateMilliseconds)
    );

    // delete the last element
    const toBeDeletedQuery = sortedByDate[MAX_QUERIES_NUMBER];
    cachedQueries.delete(toBeDeletedQuery.queryString);
    allQueries = allQueries.filter((q) => {
      return q.queryString !== toBeDeletedQuery.queryString;
    });
  }
  localStorage.setItem(QUERY_HISTORY_ITEM_KEY, JSON.stringify(allQueries));
};
