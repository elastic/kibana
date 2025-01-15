/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';

import {
  functions,
  KQL_FUNCTION_AND,
  KQL_FUNCTION_EXISTS,
  KQL_FUNCTION_NESTED,
  KQL_FUNCTION_IS,
  KQL_FUNCTION_NOT,
  KQL_FUNCTION_OR,
  KQL_FUNCTION_RANGE,
} from '../functions';
import type { DataViewBase, KueryNode, KueryQueryOptions } from '../../..';
import type { KqlContext } from '../types';

export const KQL_NODE_TYPE_FUNCTION = 'function';

export type KqlFunctionName =
  | typeof KQL_FUNCTION_AND
  | typeof KQL_FUNCTION_EXISTS
  | typeof KQL_FUNCTION_IS
  | typeof KQL_FUNCTION_NESTED
  | typeof KQL_FUNCTION_NOT
  | typeof KQL_FUNCTION_OR
  | typeof KQL_FUNCTION_RANGE;

export interface KqlFunctionNode extends KueryNode {
  arguments: unknown[];
  function: KqlFunctionName;
  type: typeof KQL_NODE_TYPE_FUNCTION;
}

export function isNode(node: KueryNode): node is KqlFunctionNode {
  return node.type === KQL_NODE_TYPE_FUNCTION;
}

export function buildNode(functionName: KqlFunctionName, ...args: any[]): KqlFunctionNode {
  const kueryFunction = functions[functionName];
  if (_.isUndefined(kueryFunction)) {
    throw new Error(`Unknown function "${functionName}"`);
  }

  return {
    type: KQL_NODE_TYPE_FUNCTION,
    function: functionName,
    // This requires better typing of the different typings and their return types.
    // @ts-ignore
    ...kueryFunction.buildNodeParams(...args),
  };
}

// Mainly only useful in the grammar where we'll already have real argument nodes in hand
export function buildNodeWithArgumentNodes(
  functionName: KqlFunctionName,
  args: any[]
): KqlFunctionNode {
  if (_.isUndefined(functions[functionName])) {
    throw new Error(`Unknown function "${functionName}"`);
  }

  return {
    type: KQL_NODE_TYPE_FUNCTION,
    function: functionName,
    arguments: args,
  };
}

export function toElasticsearchQuery(
  node: KqlFunctionNode,
  indexPattern?: DataViewBase,
  config?: KueryQueryOptions,
  context?: KqlContext
) {
  if (functions.and.isNode(node))
    return functions.and.toElasticsearchQuery(node, indexPattern, config, context);
  if (functions.exists.isNode(node))
    return functions.exists.toElasticsearchQuery(node), indexPattern, config, context;
  if (functions.is.isNode(node))
    return functions.is.toElasticsearchQuery(node, indexPattern, config, context);
  if (functions.nested.isNode(node))
    return functions.nested.toElasticsearchQuery(node, indexPattern, config, context);
  if (functions.not.isNode(node))
    return functions.not.toElasticsearchQuery(node, indexPattern, config, context);
  if (functions.or.isNode(node))
    return functions.or.toElasticsearchQuery(node, indexPattern, config, context);
  if (functions.range.isNode(node))
    return functions.range.toElasticsearchQuery(node, indexPattern, config, context);
  throw new Error(`Unknown KQL function: "${node.function}"`);
}

export function toKqlExpression(node: KqlFunctionNode): string {
  if (functions.and.isNode(node)) return functions.and.toKqlExpression(node);
  if (functions.exists.isNode(node)) return functions.exists.toKqlExpression(node);
  if (functions.is.isNode(node)) return functions.is.toKqlExpression(node);
  if (functions.nested.isNode(node)) return functions.nested.toKqlExpression(node);
  if (functions.not.isNode(node)) return functions.not.toKqlExpression(node);
  if (functions.or.isNode(node)) return functions.or.toKqlExpression(node);
  if (functions.range.isNode(node)) return functions.range.toKqlExpression(node);
  throw new Error(`Unknown KQL function: "${node.function}"`);
}
