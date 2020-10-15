/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';

import { functions } from '../functions';
import { IIndexPattern, KueryNode } from '../../..';
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
  indexPattern?: IIndexPattern,
  config?: Record<string, any>,
  context?: Record<string, any>
) {
  const kueryFunction = functions[node.function as FunctionName];
  return kueryFunction.toElasticsearchQuery(node, indexPattern, config, context);
}
