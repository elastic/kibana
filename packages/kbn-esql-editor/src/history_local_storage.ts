/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
}

const MAX_QUERIES_NUMBER = 20;

const getKey = (queryString: string) => {
  return queryString.replaceAll('\n', '').trim().replace(/\s\s+/g, ' ');
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

// Adding the maxQueriesAllowed here for testing purposes
export const addQueriesToCache = (
  item: QueryHistoryItem,
  maxQueriesAllowed = MAX_QUERIES_NUMBER
) => {
  // if the user is working on multiple tabs
  // the cachedQueries Map might not contain all
  // the localStorage queries
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
      status: item.status,
    });
  }

  let allQueries = [...getCachedQueries()];

  if (allQueries.length >= maxQueriesAllowed + 1) {
    const sortedByDate = allQueries.sort((a, b) =>
      sortDates(b?.startDateMilliseconds, a?.startDateMilliseconds)
    );

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
