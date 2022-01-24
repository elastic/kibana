/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, HttpFetchError } from 'kibana/public';
import { FLAMECHART_ROUTE_PATH, TOPN_ROUTE_PATH } from '../common';

export interface Services {
  fetchTopN: (type: string, seconds: string) => Promise<any[] | HttpFetchError>;
  fetchFlamechart: (seconds: string) => Promise<any[] | HttpFetchError>;
  fetchRawFlamechart: (seconds: string) => Promise<any[] | HttpFetchError>;
}

export function getServices(core: CoreStart): Services {
  return {
    fetchTopN: async (type: string, seconds: string) => {
      try {
        const response = await core.http.get<{ results: any[] }>(`${TOPN_ROUTE_PATH}/${type}`, {
          query: {
            index: 'profiling-events',
            projectID: 5,
            timeFrom: 1642672391,
            timeTo: 1642758791,
          },
        });
        return response;
      } catch (e) {
        return e;
      }
    },

    fetchFlamechart: async (seconds: string) => {
      try {
        const response = await core.http.get<{ results: any[] }>(
          `${FLAMECHART_ROUTE_PATH}/canvas`,
          {
            query: {
              index: 'profiling-events',
              projectID: 5,
              timeFrom: 1642672391,
              timeTo: 1642758791,
            },
          }
        );
        return response;
      } catch (e) {
        return e;
      }
    },

    fetchRawFlamechart: async (seconds: string) => {
      try {
        const response = await core.http.get<{ results: any[] }>(
          `${FLAMECHART_ROUTE_PATH}/webgl/${seconds}`
        );
        return response.results;
      } catch (e) {
        return e;
      }
    },
  };
}
