/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KqlNode, DslQuery } from './types';
import { toElasticsearchQuery as astToElasticsearchQuery } from './ast';

export type {
  DslQuery,
  KueryQueryOptions,
  KqlNode,
  KqlLiteralNode,
  KqlWildcardNode,
  KqlFunctionNode,
  KqlSuggestionNode,
  KqlAndFunctionNode,
  KqlExistsFunctionNode,
  KqlIsFunctionNode,
  KqlNestedFunctionNode,
  KqlNotFunctionNode,
  KqlOrFunctionNode,
  KqlRangeFunctionNode,
} from './types';
export { fromKueryExpression } from './ast';
export { KQLSyntaxError } from './kuery_syntax_error';
export { nodeTypes, nodeBuilder } from './node_types';
export { functions } from './functions';
export { escapeKuery } from './utils';

/**
 * @params {String} indexPattern
 * @params {Object} config - contains the dateFormatTZ
 *
 * IndexPattern isn't required, but if you pass one in, we can be more intelligent
 * about how we craft the queries (e.g. scripted fields)
 */
export const toElasticsearchQuery = (...params: Parameters<typeof astToElasticsearchQuery>) => {
  return astToElasticsearchQuery(...params) as DslQuery;
};

/**
 * @deprecated Use KqlNode instead
 */
export type KueryNode = KqlNode;
