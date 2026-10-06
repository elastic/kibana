/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpressionTypeDefinition } from '@kbn/expressions-plugin/common';
import type { EqlSearchStrategyResponse } from '..';
declare const name = 'eql_raw_response';
export interface EqlRawResponse {
  type: typeof name;
  body: EqlSearchStrategyResponse['rawResponse'];
}
export type SearchTypes =
  | string
  | string[]
  | number
  | number[]
  | boolean
  | boolean[]
  | object
  | object[]
  | undefined;
export interface TotalValue {
  value: number;
  relation: string;
}
export interface BaseHit<T> {
  _index: string;
  _id: string;
  _source: T;
  fields?: Record<string, SearchTypes[]>;
}
export interface EqlSequence<T> {
  join_keys: SearchTypes[];
  events: Array<BaseHit<T>>;
}
export interface EqlSearchResponse<T> {
  is_partial: boolean;
  is_running: boolean;
  took: number;
  timed_out: boolean;
  hits: {
    total: TotalValue;
    sequences?: Array<EqlSequence<T>>;
    events?: Array<BaseHit<T>>;
  };
}
export type EqlRawResponseExpressionTypeDefinition = ExpressionTypeDefinition<
  typeof name,
  EqlRawResponse,
  EqlRawResponse
>;
export declare const eqlRawResponse: EqlRawResponseExpressionTypeDefinition;
export {};
