/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewBase, KueryQueryOptions } from '../..';
import type { KqlNode } from './types';
import {
  functions,
  KQL_FUNCTION_NAME_AND,
  KQL_FUNCTION_NAME_EXISTS,
  KQL_FUNCTION_NAME_IS,
  KQL_FUNCTION_NAME_NESTED,
  KQL_FUNCTION_NAME_NOT,
  KQL_FUNCTION_NAME_OR,
  KQL_FUNCTION_NAME_RANGE,
} from '../functions';

export const KQL_NODE_TYPE_FUNCTION = 'function';

export type KqlFunctionName =
  | typeof KQL_FUNCTION_NAME_AND
  | typeof KQL_FUNCTION_NAME_EXISTS
  | typeof KQL_FUNCTION_NAME_IS
  | typeof KQL_FUNCTION_NAME_NESTED
  | typeof KQL_FUNCTION_NAME_NOT
  | typeof KQL_FUNCTION_NAME_OR
  | typeof KQL_FUNCTION_NAME_RANGE;

export interface KqlFunctionNode extends KqlNode {
  type: typeof KQL_NODE_TYPE_FUNCTION;
  function: KqlFunctionName;
  arguments: KqlNode[];
}

export function isNode(node: KqlNode): node is KqlFunctionNode {
  return node.type === KQL_NODE_TYPE_FUNCTION;
}

export function buildNode(fnName: KqlFunctionName, args: KqlNode[]): KqlFunctionNode {
  return {
    type: KQL_NODE_TYPE_FUNCTION,
    function: fnName,
    arguments: args,
  };
}

export function toElasticsearchQuery(
  node: KqlFunctionNode,
  indexPattern?: DataViewBase,
  config?: KueryQueryOptions,
  context?: Record<string, any>
) {
  if (functions.and.isNode(node)) {
    return functions.and.toElasticsearchQuery(node, indexPattern, config, context);
  } else if (functions.exists.isNode(node)) {
    return functions.exists.toElasticsearchQuery(node, indexPattern, config, context);
  } else if (functions.is.isNode(node)) {
    return functions.is.toElasticsearchQuery(node, indexPattern, config, context);
  } else if (functions.nested.isNode(node)) {
    return functions.nested.toElasticsearchQuery(node, indexPattern, config, context);
  } else if (functions.not.isNode(node)) {
    return functions.not.toElasticsearchQuery(node, indexPattern, config, context);
  } else if (functions.or.isNode(node)) {
    return functions.or.toElasticsearchQuery(node, indexPattern, config, context);
  } else if (functions.range.isNode(node)) {
    return functions.range.toElasticsearchQuery(node, indexPattern, config, context);
  }
  throw new Error(`Unsupported KQL function: ${node.function}`);
}
