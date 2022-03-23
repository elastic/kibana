/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KqlNode } from './types';
import { KqlLiteralNode, KqlLiteralType } from './literal';
import { fromLiteralExpression } from '../ast';

export const KQL_NODE_TYPE_WILDCARD = 'wildcard';
export const KQL_WILDCARD_SYMBOL = '@kuery-wildcard@';

/**
 * KQL node representing a wildcard (e.g. "logs*"), which can be used to represent multiple field
 * names or multiple values
 */
export interface KqlWildcardNode extends KqlNode {
  type: typeof KQL_NODE_TYPE_WILDCARD;
  value: KqlLiteralType;
}

export function isNode(node: KqlNode): node is KqlWildcardNode {
  return node.type === KQL_NODE_TYPE_WILDCARD;
}

export function buildNode(value: string): KqlWildcardNode {
  if (!value.includes(KQL_WILDCARD_SYMBOL)) {
    const node = fromLiteralExpression(value);
    if (isNode(node)) return node;
    throw new Error(`Cannot create wildcard node from value: "${value}"`);
  }

  return {
    type: KQL_NODE_TYPE_WILDCARD,
    value: `${value}`,
  };
}

export function toElasticsearchQuery(node: KqlWildcardNode) {
  const { value } = node;
  return `${value}`.split(KQL_WILDCARD_SYMBOL).join('*');
}

// Copied from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// See https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#_reserved_characters
function escapeQueryString(str: string) {
  return str.replace(/[+-=&|><!(){}[\]^"~*?:\\/]/g, '\\$&'); // $& means the whole matched string
}

export function test(node: KqlLiteralNode | KqlWildcardNode, str: string): boolean {
  const value = `${node.value}`;
  const regex = `${value}`.split(KQL_WILDCARD_SYMBOL).map(escapeRegExp).join('[\\s\\S]*');
  const regexp = new RegExp(`^${regex}$`);
  return regexp.test(str);
}

export function toQueryStringQuery(node: KqlLiteralNode | KqlWildcardNode): string {
  const value = `${node.value}`;
  return value.split(KQL_WILDCARD_SYMBOL).map(escapeQueryString).join('*');
}

export function hasLeadingWildcard(node: KqlLiteralNode | KqlWildcardNode): boolean {
  const value = `${node.value}`;
  // A lone wildcard turns into an `exists` query, so we're only concerned with
  // leading wildcards followed by additional characters.
  return value.startsWith(KQL_WILDCARD_SYMBOL) && value.replace(KQL_WILDCARD_SYMBOL, '').length > 0;
}
