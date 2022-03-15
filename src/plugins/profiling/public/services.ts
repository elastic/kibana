/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, HttpFetchError, HttpFetchQuery } from 'kibana/public';
import { getRemoteRoutePaths } from '../common';

export interface Services {
  fetchTopN: (type: string, seconds: string) => Promise<any[] | HttpFetchError>;
  fetchElasticFlamechart: (timeFrom: number, timeTo: number) => Promise<any[] | HttpFetchError>;
  fetchPixiFlamechart: (timeFrom: number, timeTo: number) => Promise<any[] | HttpFetchError>;
}

export function getServices(core: CoreStart): Services {
  // To use local fixtures instead, use getLocalRoutePaths
  const paths = getRemoteRoutePaths();

  return {
    fetchTopN: async (type: string, seconds: string) => {
      try {
        const unixTime = Math.floor(Date.now() / 1000);
        const query: HttpFetchQuery = {
          index: 'profiling-events',
          projectID: 5,
          timeFrom: unixTime - parseInt(seconds, 10),
          timeTo: unixTime,
          // TODO remove hard-coded value for topN items length and expose it through the UI
          n: 100,
        };
        return await core.http.get(`${paths.TopN}/${type}`, { query });
      } catch (e) {
        return e;
      }
    },

    fetchElasticFlamechart: async (timeFrom: number, timeTo: number) => {
      try {
        const query: HttpFetchQuery = {
          index: 'profiling-events',
          projectID: 5,
          timeFrom: timeFrom,
          timeTo: timeTo,
          // TODO remove hard-coded value for topN items length and expose it through the UI
          n: 100,
        };
        return await core.http.get(paths.FlamechartElastic, { query });
      } catch (e) {
        return e;
      }
    },

    fetchPixiFlamechart: async (timeFrom: number, timeTo: number) => {
      try {
        const query: HttpFetchQuery = {
          index: 'profiling-events',
          projectID: 5,
          timeFrom: timeFrom,
          timeTo: timeTo,
          // TODO remove hard-coded value for topN items length and expose it through the UI
          n: 100,
        };
        return await core.http.get(paths.FlamechartPixi, { query });
      } catch (e) {
        return e;
      }
    },
  };
}
