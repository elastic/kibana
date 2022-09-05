/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KueryNode } from '..';

export const KQL_WILDCARD_SYMBOL = '@kuery-wildcard@';
export const KQL_NODE_TYPE_WILDCARD = 'wildcard';

export interface KqlWildcardNode extends KueryNode {
  type: typeof KQL_NODE_TYPE_WILDCARD;
  value: string;
}

// Copied from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// See https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#_reserved_characters
function escapeQueryString(str: string) {
  return str.replace(/[+-=&|><!(){}[\]^"~*?:\\/]/g, '\\$&'); // $& means the whole matched string
}

export function isNode(node: KueryNode): node is KqlWildcardNode {
  return node.type === KQL_NODE_TYPE_WILDCARD;
}

export function isMatchAll(node: KqlWildcardNode) {
  return node.value === KQL_WILDCARD_SYMBOL;
}

export function buildNode(value: string): KqlWildcardNode {
  // When called from the parser, all wildcard characters are replaced with a special flag (since escaped wildcards are
  // handled as normal strings). However, when invoking programmatically, callers shouldn't need to do this replacement.
  if (!value.includes(KQL_NODE_TYPE_WILDCARD) && value.includes('*')) {
    return buildNode(value.replaceAll('*', KQL_WILDCARD_SYMBOL));
  }

  return {
    type: KQL_NODE_TYPE_WILDCARD,
    value,
  };
}

export function test(node: KqlWildcardNode, str: string) {
  const { value } = node;
  const regex = value.split(KQL_WILDCARD_SYMBOL).map(escapeRegExp).join('[\\s\\S]*');
  const regexp = new RegExp(`^${regex}$`);
  return regexp.test(str);
}

export function toElasticsearchQuery(node: KqlWildcardNode) {
  const { value } = node;
  return value.split(KQL_WILDCARD_SYMBOL).join('*');
}

export function toQueryStringQuery(node: KqlWildcardNode) {
  const { value } = node;
  return value.split(KQL_WILDCARD_SYMBOL).map(escapeQueryString).join('*');
}

export function isLoneWildcard({ value }: KqlWildcardNode) {
  return value.includes(KQL_WILDCARD_SYMBOL) && value.replace(KQL_WILDCARD_SYMBOL, '').length === 0;
}

export function hasLeadingWildcard(node: KqlWildcardNode) {
  return !isLoneWildcard(node) && node.value.startsWith(KQL_WILDCARD_SYMBOL);
}
