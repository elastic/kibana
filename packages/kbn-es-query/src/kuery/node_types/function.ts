/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';

import { functions } from '../functions';
import { DataViewBase, KueryNode, KueryQueryOptions } from '../..';
import { FunctionName, FunctionTypeBuildNode } from './types';

export function buildNode(functionName: FunctionName, ...args: any[]) {
  const kueryFunction = functions[functionName];
  if (_.isUndefined(kueryFunction)) {
    throw new Error(`Unknown function "${functionName}"`);
  }

  return {
    type: 'function' as 'function',
    function: functionName,
    // This requires better typing of the different typings and their return types.
    // @ts-ignore
    ...kueryFunction.buildNodeParams(...args),
  };
}

// Mainly only useful in the grammar where we'll already have real argument nodes in hand
export function buildNodeWithArgumentNodes(
  functionName: FunctionName,
  args: any[]
): FunctionTypeBuildNode {
  if (_.isUndefined(functions[functionName])) {
    throw new Error(`Unknown function "${functionName}"`);
  }

  return {
    type: 'function',
    function: functionName,
    arguments: args,
  };
}

export function toElasticsearchQuery(
  node: KueryNode,
  indexPattern?: DataViewBase,
  config?: KueryQueryOptions,
  context?: Record<string, any>
) {
  const kueryFunction = functions[node.function as FunctionName];
  return kueryFunction.toElasticsearchQuery(node, indexPattern, config, context);
}
