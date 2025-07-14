/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLAstQueryExpression, ESQLCommand } from '@kbn/esql-ast';

export interface Command {
  body: string;
}

type StringToUnion<S> = S extends `${infer First}${infer Rest}`
  ? First | StringToUnion<Rest>
  : never;
type AlphaLower = StringToUnion<'abcdefghijklmnopqrstuvwxyz'>;
type AllowedParamChar = AlphaLower | Uppercase<AlphaLower> | StringToUnion<'0123456789'> | '_';

type ExtractSingleParam<
  S extends string,
  Acc extends string = ''
> = S extends `${infer First}${infer Rest}`
  ? First extends AllowedParamChar
    ? ExtractSingleParam<Rest, `${Acc}${First}`>
    : [Acc, `${First}${Rest}`]
  : [Acc, ''];

export type ExtractNamedParamNames<
  S extends string,
  Acc extends string = never
> = S extends `${infer _Before}?${infer After}`
  ? ExtractSingleParam<After> extends [infer Param extends string, infer Rest extends string]
    ? Param extends ''
      ? ExtractNamedParamNames<Rest, Acc>
      : ExtractNamedParamNames<Rest, Acc | Param>
    : Acc
  : Acc;
export type FieldValue = number | string | boolean | null;

export type NamedParameter<TQuery extends string = string> = Record<
  ExtractNamedParamNames<TQuery>,
  NonNullable<FieldValue>
>;

export type Params<TQuery extends string = string> = NamedParameter<TQuery> | FieldValue;

export interface QueryPipeline {
  pipe: (...args: QueryOperator[]) => QueryPipeline;
  pipeIf(condition: boolean, ...args: QueryOperator[]): QueryPipeline;
  toString: () => string;
  asRequest: () => QueryRequest;
}
export interface Query {
  root: ESQLAstQueryExpression;
  commands: Array<ESQLCommand<string>>;
  params: Params[];
}

export interface QueryRequest {
  query: string;
  params: Params[];
}

export type QueryOperator = (sourceQuery: Query) => Query;
