/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import { from } from 'rxjs';
import { ISearchStrategy } from '../../../src/plugins/data/server';
import { FibonacciRequest, FibonacciResponse } from '../common/types';

export const fibonacciStrategyProvider = (): ISearchStrategy<
  FibonacciRequest,
  FibonacciResponse
> => {
  const responseMap = new Map<string, [number, number, number]>();
  return {
    search: (request) => {
      const search = async () => {
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

        return { id, loaded, total, isRunning, isPartial, rawResponse: { took, values } };
      };
      return from(search());
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
