/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ISearchStrategy } from '../../../src/plugins/data/server';
import { ASYNC_DEMO_SEARCH_STRATEGY, IAsyncDemoRequest } from '../common';

export const asyncDemoSearchStrategyProvider = (): ISearchStrategy<
  typeof ASYNC_DEMO_SEARCH_STRATEGY
> => {
  function getFibonacciSequence(n = 0) {
    const beginning = [0, 1].slice(0, n);
    return Array(Math.max(0, n))
      .fill(null)
      .reduce((sequence, value, i) => {
        if (i < 2) return sequence;
        return [...sequence, sequence[i - 1] + sequence[i - 2]];
      }, beginning);
  }

  const generateId = (() => {
    let id = 0;
    return () => `${id++}`;
  })();

  const loadedMap = new Map<string, number>();
  const totalMap = new Map<string, number>();

  return {
    search: async (context, request: IAsyncDemoRequest) => {
      const id = request.id ?? generateId();

      const loaded = (loadedMap.get(id) ?? 0) + 1;
      loadedMap.set(id, loaded);

      const total = request.fibonacciNumbers ?? totalMap.get(id);
      totalMap.set(id, total);

      const fibonacciSequence = getFibonacciSequence(loaded);
      return { id, total, loaded, fibonacciSequence };
    },
    cancel: async (context, id) => {
      loadedMap.delete(id);
      totalMap.delete(id);
    },
  };
};
