/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * @public
 */
export type { QueryDslQueryContainer as DslQuery } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
export type {
  KqlNode,
  KqlLiteralNode,
  KqlWildcardNode,
  KqlFunctionNode,
  KqlSuggestionNode,
} from './node_types/types';

export type {
  KqlAndFunctionNode,
  KqlExistsFunctionNode,
  KqlIsFunctionNode,
  KqlNestedFunctionNode,
  KqlNotFunctionNode,
  KqlOrFunctionNode,
  KqlRangeFunctionNode,
} from './functions/types';

/** @internal */
export interface KueryParseOptions {
  startRule: string;
  allowLeadingWildcards: boolean;
  cursorSymbol?: string;
  parseCursor?: boolean;
}

/** @internal */
export interface KqlContext {
  nested?: {
    path: string;
  };
}

/** @public */
export interface KueryQueryOptions {
  filtersInMustClause?: boolean;
  dateFormatTZ?: string;
}
