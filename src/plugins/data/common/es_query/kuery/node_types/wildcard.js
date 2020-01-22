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

import { fromLiteralExpression } from '../ast/ast';

export const wildcardSymbol = '@kuery-wildcard@';

// Copied from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// See https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#_reserved_characters
function escapeQueryString(string) {
  return string.replace(/[+-=&|><!(){}[\]^"~*?:\\/]/g, '\\$&'); // $& means the whole matched string
}

export function buildNode(value) {
  if (!value.includes(wildcardSymbol)) {
    return fromLiteralExpression(value);
  }

  return {
    type: 'wildcard',
    value,
  };
}

export function test(node, string) {
  const { value } = node;
  const regex = value
    .split(wildcardSymbol)
    .map(escapeRegExp)
    .join('[\\s\\S]*');
  const regexp = new RegExp(`^${regex}$`);
  return regexp.test(string);
}

export function toElasticsearchQuery(node) {
  const { value } = node;
  return value.split(wildcardSymbol).join('*');
}

export function toQueryStringQuery(node) {
  const { value } = node;
  return value
    .split(wildcardSymbol)
    .map(escapeQueryString)
    .join('*');
}

export function hasLeadingWildcard(node) {
  const { value } = node;
  // A lone wildcard turns into an `exists` query, so we're only concerned with
  // leading wildcards followed by additional characters.
  return value.startsWith(wildcardSymbol) && value.replace(wildcardSymbol, '').length > 0;
}
