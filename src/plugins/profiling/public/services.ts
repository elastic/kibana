/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, HttpFetchError, HttpFetchQuery } from 'kibana/public';
import { getRoutePaths } from '../common';

export interface Services {
  fetchTopN: (
    type: string,
    index: string,
    projectID: number,
    timeFrom: number,
    timeTo: number,
    n: number
  ) => Promise<any[] | HttpFetchError>;
  fetchElasticFlamechart: (
    index: string,
    projectID: number,
    timeFrom: number,
    timeTo: number,
    n: number
  ) => Promise<any[] | HttpFetchError>;
  fetchPixiFlamechart: (
    index: string,
    projectID: number,
    timeFrom: number,
    timeTo: number,
    n: number
  ) => Promise<any[] | HttpFetchError>;
}

export function getServices(core: CoreStart): Services {
  const paths = getRoutePaths();

  return {
    fetchTopN: async (
      type: string,
      index: string,
      projectID: number,
      timeFrom: number,
      timeTo: number,
      n: number
    ) => {
      try {
        const query: HttpFetchQuery = {
          index,
          projectID,
          timeFrom,
          timeTo,
          n,
        };
        return await core.http.get(`${paths.TopN}/${type}`, { query });
      } catch (e) {
        return e;
      }
    },

    fetchElasticFlamechart: async (
      index: string,
      projectID: number,
      timeFrom: number,
      timeTo: number,
      n: number
    ) => {
      try {
        const query: HttpFetchQuery = {
          index,
          projectID,
          timeFrom,
          timeTo,
          n,
        };
        return await core.http.get(paths.FlamechartElastic, { query });
      } catch (e) {
        return e;
      }
    },

    fetchPixiFlamechart: async (
      index: string,
      projectID: number,
      timeFrom: number,
      timeTo: number,
      n: number
    ) => {
      try {
        const query: HttpFetchQuery = {
          index,
          projectID,
          timeFrom,
          timeTo,
          n,
        };
        return await core.http.get(paths.FlamechartPixi, { query });
      } catch (e) {
        return e;
      }
    },
  };
}
