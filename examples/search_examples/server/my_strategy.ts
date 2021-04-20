/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { map } from 'rxjs/operators';
import { of } from 'rxjs';
import uuid from 'uuid';
import { ISearchStrategy, PluginStart } from '../../../src/plugins/data/server';
import { IMyStrategyResponse, IMyStrategyRequest } from '../common';
import { IKibanaSearchRequest, IKibanaSearchResponse } from '../../../src/plugins/data/common';

export const mySearchStrategyProvider = (
  data: PluginStart
): ISearchStrategy<IMyStrategyRequest, IMyStrategyResponse> => {
  const es = data.search.getSearchStrategy();
  return {
    search: (request, options, deps) =>
      es.search(request, options, deps).pipe(
        map((esSearchRes) => ({
          ...esSearchRes,
          cool: request.get_cool ? 'YES' : 'NOPE',
          executed_at: new Date().getTime(),
        }))
      ),
    cancel: async (id, options, deps) => {
      if (es.cancel) {
        await es.cancel(id, options, deps);
      }
    },
  };
};

type FibonacciRequest = IKibanaSearchRequest<{ n: number }>;

type FibonacciResponse = IKibanaSearchResponse<{ values: number[] }>;

export const fibonacciStrategyProvider = (): ISearchStrategy<
  FibonacciRequest,
  FibonacciResponse
> => {
  const responseMap = new Map<string, [number, number, number]>();
  return {
    search: (request) => {
      const id = request.id ?? uuid();
      const [prevLoaded, total, started] = responseMap.get(id) ?? [
        0,
        request.params?.n!,
        Date.now(),
      ];
      const loaded = prevLoaded + 1;
      const sequence = fibonacci(loaded);
      if (loaded < total) {
        responseMap.set(id, [loaded, total, started]);
      } else {
        responseMap.delete(id);
      }

      const isRunning = loaded < total;
      const isPartial = isRunning;
      const took = Date.now() - started;
      const values = sequence.slice(0, loaded);

      return of({ id, loaded, total, isRunning, isPartial, rawResponse: { took, values } });
    },
    cancel: async (id, options, deps) => {
      responseMap.delete(id);
    },
  };
};

function fibonacci(n = 0) {
  return Array(n)
    .fill(null)
    .reduce((arr, _, i) => {
      if (i < 2) {
        arr.push(i);
      } else {
        arr.push(arr[i - 1] + arr[i - 2]);
      }
      return arr;
    }, []);
}
