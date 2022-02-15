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
  fetchElasticFlamechart: (seconds: string) => Promise<any[] | HttpFetchError>;
  fetchPixiFlamechart: (seconds: string) => Promise<any[] | HttpFetchError>;
}

function getFetchQuery(seconds: string): HttpFetchQuery {
  const unixTime = Math.floor(Date.now() / 1000);
  return {
    index: 'profiling-events',
    projectID: 5,
    timeFrom: unixTime - parseInt(seconds),
    timeTo: unixTime,
  } as HttpFetchQuery;
}

export function getServices(core: CoreStart): Services {
  // To use local fixtures instead, use getLocalRoutePaths
  const paths = getRemoteRoutePaths();

  return {
    fetchTopN: async (type: string, seconds: string) => {
      try {
        const query = getFetchQuery(seconds);
        const response = await core.http.get(
          `${paths.TopN}/${type}`,
          { query }
        );
        return response;
      } catch (e) {
        return e;
      }
    },

    fetchElasticFlamechart: async (seconds: string) => {
      try {
        const query = getFetchQuery(seconds);
        const response = await core.http.get(
          paths.FlamechartElastic,
          { query }
        );
        return response;
      } catch (e) {
        return e;
      }
    },

    fetchPixiFlamechart: async (seconds: string) => {
      try {
        const query = getFetchQuery(seconds);
        const response = await core.http.get(
          paths.FlamechartPixi,
          { query }
        );
        return response;
      } catch (e) {
        return e;
      }
    },
  };
}
