/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fromKueryExpression, KueryNode } from '../../..';
import { nodeTypes } from '../node_types';
import { functions } from '../functions';

export function getKqlFieldNamesFromExpression(expression: string): string[] {
  const node = fromKueryExpression(expression);
  return getKqlFieldNames(node);
}

export function getKqlFieldNames(node: KueryNode): string[] {
  if (nodeTypes.function.isNode(node)) {
    if (functions.and.isNode(node) || functions.or.isNode(node)) {
      return node.arguments.reduce<string[]>((result, child) => {
        return result.concat(getKqlFieldNames(child));
      }, []);
    } else if (
      functions.not.isNode(node) ||
      functions.exists.isNode(node) ||
      functions.is.isNode(node) ||
      functions.nested.isNode(node) ||
      functions.range.isNode(node)
    ) {
      // For each of these field types, we only need to look at the first argument to determine the fields
      const [fieldNode] = node.arguments;
      return getKqlFieldNames(fieldNode);
    } else {
      throw new Error(`KQL function ${node.function} not supported in getKqlFieldNames`);
    }
  } else if (nodeTypes.literal.isNode(node)) {
    if (node.value === null) return [];
    return [`${nodeTypes.literal.toElasticsearchQuery(node)}`];
  } else if (nodeTypes.wildcard.isNode(node)) {
    return [nodeTypes.wildcard.toElasticsearchQuery(node)];
  } else {
    throw new Error(`KQL node type ${node.type} not supported in getKqlFieldNames`);
  }
}
