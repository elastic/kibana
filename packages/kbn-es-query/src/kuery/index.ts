/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { toElasticsearchQuery as astToElasticsearchQuery } from './ast';

/**
 * @params {String} indexPattern
 * @params {Object} config - contains the dateFormatTZ
 *
 * IndexPattern isn't required, but if you pass one in, we can be more intelligent
 * about how we craft the queries (e.g. scripted fields)
 */
export const toElasticsearchQuery = (...params: Parameters<typeof astToElasticsearchQuery>) => {
  return astToElasticsearchQuery(...params) as estypes.QueryDslQueryContainer;
};

export { KQLSyntaxError } from './kuery_syntax_error';
export { nodeTypes, nodeBuilder } from './node_types';
export { fromKueryExpression } from './ast';
export { escapeKuery } from './utils';
export type { FunctionTypeBuildNode, NodeTypes } from './node_types';
export type { DslQuery, KueryNode, KueryQueryOptions, KueryParseOptions } from './types';
