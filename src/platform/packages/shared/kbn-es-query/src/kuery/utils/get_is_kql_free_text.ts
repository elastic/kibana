/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KueryNode } from '../../..';
import { fromKueryExpression } from '../../..';
import { nodeTypes } from '../node_types';
import { functions } from '../functions';

/**
 * Returns true whether the given expression contains at least one free text expression (e.g. `foo: "bar" AND my_free_text_query`)
 */
export function getIsKqlFreeTextExpression(expression: string): boolean {
  const node = fromKueryExpression(expression);
  return getIsKqlFreeText(node);
}

export function getIsKqlFreeText(node: KueryNode): boolean {
  if (nodeTypes.function.isNode(node)) {
    if (functions.and.isNode(node) || functions.or.isNode(node)) {
      return node.arguments.reduce<boolean>((result, child) => {
        return result || getIsKqlFreeText(child);
      }, false);
    } else if (
      functions.not.isNode(node) ||
      functions.exists.isNode(node) ||
      functions.is.isNode(node) ||
      functions.nested.isNode(node) ||
      functions.range.isNode(node)
    ) {
      // For each of these field types, we only need to look at the first argument to determine the fields
      const [fieldNode] = node.arguments;
      return getIsKqlFreeText(fieldNode);
    } else {
      throw new Error(`KQL function ${node.function} not supported in isKqlFreeText`);
    }
  } else if (nodeTypes.literal.isNode(node)) {
    return node.value === null;
  } else if (nodeTypes.wildcard.isNode(node)) {
    return false;
  } else {
    throw new Error(`KQL node type ${node.type} not supported in isKqlFreeText`);
  }
}
