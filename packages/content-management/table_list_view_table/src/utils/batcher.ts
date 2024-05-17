/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Batcher. (Inspired by @yornaath/batshit, couldn't use the lib because couldn't import not transpiled code)
 * A batch manager that will batch requests for a certain data type within a given window.
 *
 * @generic Data - The type of the data return by fetcher.
 * @generic Query - item query type
 * @generic Result - the result of the individual request
 */
export interface Batcher<Data, Query, Result = Data> {
  fetch: (query: Query) => Promise<Result>;
}

/**
 * Config needed to create a Batcher
 *
 * @generic Data - The type of the data.
 * @generic Query - item query type
 * @generic Result - the result of the individual request
 */
export interface BatcherConfig<Data, Query, Result> {
  /**
   * Fetcher function that will be called with a batch of queries.
   * @param queries
   */
  fetcher: (queries: Query[]) => Promise<Data>;

  /**
   * Resolver function that will be called with the fetched data and the query.
   * Should return the result of the individual "request".
   */
  resolver: (items: Data, query: Query) => Result;
}

interface BatcherMemory<Data, Query> {
  batch: Set<Query>;
  currentRequest: Deferred<Data>;
  timer?: NodeJS.Timeout | undefined;
  start?: number | null;
  latest?: number | null;
}

/**
 * Create a batch manager for a given collection of a data type.
 * Will batch all .get calls given inside a scheduled time window into a single request.
 */
export const createBatcher = <Data, Query, R = Data>(
  config: BatcherConfig<Data, Query, R>
): Batcher<Data, Query, ReturnType<(typeof config)['resolver']>> => {
  const mem: BatcherMemory<Data, Query> = {
    batch: new Set<Query>(),
    currentRequest: deferred<Data>(),
    timer: undefined,
    start: null,
    latest: null,
  };

  const nextBatch = () => {
    mem.batch = new Set();
    mem.currentRequest = deferred<Data>();
    mem.timer = undefined;
    mem.start = null;
    mem.latest = null;
  };

  const fetch = (query: Query): Promise<R> => {
    if (!mem.start) mem.start = Date.now();
    mem.latest = Date.now();

    mem.batch.add(query);
    clearTimeout(mem.timer);

    const fetchBatch = () => {
      const req = config.fetcher([...mem.batch]);
      const currentRequest = mem.currentRequest;

      nextBatch();

      req
        .then((data) => {
          currentRequest.resolve(data);
        })
        .catch((error) => {
          currentRequest.reject(error);
        });

      return req;
    };

    // wait 50 ms max before fetching the batch
    mem.timer = setTimeout(fetchBatch, 50 - (mem.latest - mem.start));
    return mem.currentRequest.value.then((items) => config.resolver(items, query));
  };

  return { fetch };
};

interface Deferred<T> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  value: Promise<T>;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: Deferred<T>['resolve'];
  let reject!: Deferred<T>['reject'];

  const value = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return {
    resolve,
    reject,
    value,
  };
};
