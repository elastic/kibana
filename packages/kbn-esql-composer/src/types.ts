/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { QueryBuilder } from './builder';

export interface Command {
  body: string;
}

// Replace
export type FieldValue = number | string | boolean | null;
export type NamedParameterWithIdentifier = Record<string, { identifier: string }>;
export type NamedParameter = Record<string, string> | NamedParameterWithIdentifier;

export type Params = NamedParameter | FieldValue | Array<FieldValue | NamedParameter>;
export interface QueryPipeline {
  pipe: (...args: Array<QueryOperator | QueryOperatorConvertible>) => QueryPipeline;
  asRequest: () => QueryRequest;
  asString: () => string;
}
export interface Query {
  commands: Command[];
  params: Params[];
}

export interface QueryRequest {
  query: string;
  params: Params[];
}

export type QueryOperator = (sourceQuery: Query) => Query;
export interface BuilderCommand<TType extends string = string> {
  command: string | (() => QueryBuilder);
  params?: Params;
  type: TType;
  nested?: boolean;
}

export interface ChainedCommand {
  command: string;
  params?: Params;
}

export interface QueryOperatorConvertible {
  toQueryOperator(): QueryOperator;
}
