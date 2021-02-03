/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { fromLiteralExpression } from '../ast/ast';
import { WildcardTypeBuildNode } from './types';
import { KueryNode } from '..';

export const wildcardSymbol = '@kuery-wildcard@';

// Copied from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// See https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#_reserved_characters
function escapeQueryString(str: string) {
  return str.replace(/[+-=&|><!(){}[\]^"~*?:\\/]/g, '\\$&'); // $& means the whole matched string
}

export function buildNode(value: string): WildcardTypeBuildNode | KueryNode {
  if (!value.includes(wildcardSymbol)) {
    return fromLiteralExpression(value);
  }

  return {
    type: 'wildcard',
    value,
  };
}

export function test(node: any, str: string): boolean {
  const { value } = node;
  const regex = value.split(wildcardSymbol).map(escapeRegExp).join('[\\s\\S]*');
  const regexp = new RegExp(`^${regex}$`);
  return regexp.test(str);
}

export function toElasticsearchQuery(node: any): string {
  const { value } = node;
  return value.split(wildcardSymbol).join('*');
}

export function toQueryStringQuery(node: any): string {
  const { value } = node;
  return value.split(wildcardSymbol).map(escapeQueryString).join('*');
}

export function hasLeadingWildcard(node: any): boolean {
  const { value } = node;
  // A lone wildcard turns into an `exists` query, so we're only concerned with
  // leading wildcards followed by additional characters.
  return value.startsWith(wildcardSymbol) && value.replace(wildcardSymbol, '').length > 0;
}
