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
export type NamedParameterWithIdentifier = Record<
  string,
  { identifier: string } | { pattern: string }
>;
export type NamedParameter = Record<string, string> | NamedParameterWithIdentifier;

export type Params = NamedParameter | FieldValue | Array<FieldValue | NamedParameter>;
export interface QueryPipeline {
  pipe: (...args: Array<QueryOperator | QueryBuilderToOperator>) => QueryPipeline;
  asString: () => string;
  getBindings: () => Params[];
}
export interface Query {
  commands: Command[];
  bindings: Params[];
}

export type QueryOperator = (sourceQuery: Query) => Query;
export interface BuilderCommand<TType extends string = string> {
  command: string | (() => QueryBuilder);
  bindings?: Params;
  type: TType;
  nested?: boolean;
}

export interface ChainedCommand {
  command: string;
  bindings?: Params;
}

export interface QueryBuilderToOperator {
  toQueryOperator(): QueryOperator;
}
