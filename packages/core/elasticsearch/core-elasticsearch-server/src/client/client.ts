/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client } from '@elastic/elasticsearch';

type OmitTimeout<T> = T extends { timeout?: any } ? Omit<T, 'timeout'> : T;

type OmitTimeoutFromMethods<T> = T extends <TReturn = any, TReturn1 = any>(
  ...args: infer A
) => infer R
  ? <TReturn = any, TReturn1 = any>(
      ...args: { [K in keyof A]: OmitTimeout<A[K]> }
    ) => R extends Promise<infer U> ? Promise<U> : R
  : T;

type OmitTimeoutFromAPI<API> = {
  [K in keyof API]: API[K] extends (...args: any[]) => any
    ? OmitTimeoutFromMethods<API[K]>
    : API[K] extends Record<string, any>
    ? OmitTimeoutFromAPI<API[K]>
    : API[K];
};

type TimeoutFreeClient = OmitTimeoutFromAPI<Client>;

/**
 * Client used to query the elasticsearch cluster.
 *
 * @public
 */
export type ElasticsearchClient = Omit<
  TimeoutFreeClient, // & { child(opts: ClientOptions): ElasticsearchClient },
  'connectionPool' | 'serializer' | 'extend' | 'close' | 'diagnostic'
>;

// let a: ElasticsearchClient;
// let b = await a.search<{ a: string }>({}); // $ExpectType Promise<SearchResponse<{ a: string; }>>
// b; // $ExpectType SearchResponse<{ a: string; }>

// let c: Client;
// const d = await c.search<{ a: string }>({}); // $ExpectType Promise<SearchResponse<{ a: string; }>>
// d; // $ExpectType SearchResponse<{ a: string; }>

// b = d;
