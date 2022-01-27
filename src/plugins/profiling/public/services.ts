/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, HttpFetchError, HttpFetchQuery } from 'kibana/public';
import { FLAMECHART_ROUTE_PATH, TOPN_ROUTE_PATH } from '../common';

export interface Services {
  fetchTopN: (type: string, seconds: string) => Promise<any[] | HttpFetchError>;
  fetchFlamechart: (seconds: string) => Promise<any[] | HttpFetchError>;
  fetchRawFlamechart: (seconds: string) => Promise<any[] | HttpFetchError>;
}

function getFetchQuery(seconds: string): HttpFetchQuery {
  const unixTime = Math.floor(Date.now() / 1000);
  return {
    index: 'profiling-events',
    projectID: 5,
    timeFrom: unixTime - parseInt(seconds),
    timeTo: unixTime
  } as HttpFetchQuery;
}

export function getServices(core: CoreStart): Services {
  return {
    fetchTopN: async (type: string, seconds: string) => {
      try {
        const query = getFetchQuery(seconds);
        const response = await core.http.get<{ results: any[] }>(
          `${TOPN_ROUTE_PATH}/${type}`,
          { query }
        );
        return response;
      } catch (e) {
        return e;
      }
    },

    fetchFlamechart: async (seconds: string) => {
      try {
        const query = getFetchQuery(seconds);
        const response = await core.http.get<{ results: any[] }>(
          `${FLAMECHART_ROUTE_PATH}/canvas`,
          { query }
        );
        return response;
      } catch (e) {
        return e;
      }
    },

    fetchRawFlamechart: async (seconds: string) => {
      try {
        const query = getFetchQuery(seconds);
        const response = await core.http.get<{ results: any[] }>(
          `${FLAMECHART_ROUTE_PATH}/webgl/${seconds}`,
          { query }
        );
        return response.results;
      } catch (e) {
        return e;
      }
    },
  };
}
