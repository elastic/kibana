/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type KueryNode, escapeKuery, escapeQuotes } from '..';

export const KQL_NODE_TYPE_LITERAL = 'literal';

export type KqlLiteralType = null | boolean | number | string;

export interface KqlLiteralNode extends KueryNode {
  type: typeof KQL_NODE_TYPE_LITERAL;
  value: KqlLiteralType;
  isQuoted: boolean;
}

export function isNode(node: KueryNode): node is KqlLiteralNode {
  return node.type === KQL_NODE_TYPE_LITERAL;
}

export function buildNode(value: KqlLiteralType, isQuoted: boolean = false): KqlLiteralNode {
  return {
    type: KQL_NODE_TYPE_LITERAL,
    value,
    isQuoted,
  };
}

export function toElasticsearchQuery(node: KqlLiteralNode) {
  return node.value;
}

export function toKqlExpression(node: KqlLiteralNode): string {
  return node.isQuoted ? `"${escapeQuotes(`${node.value}`)}"` : escapeKuery(`${node.value}`);
}
