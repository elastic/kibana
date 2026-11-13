/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DataViewBase, KueryQueryOptions } from '../../..';
import type { KqlFunctionNode, KqlLiteralNode } from '../node_types';
import type { KqlLiteralType } from '../node_types/literal';
import type { KqlContext } from '../types';
import {
  buildNode as buildLiteralNode,
  toElasticsearchQuery as literalToElasticsearchQuery,
  toKqlExpression as literalToKqlExpression,
} from '../node_types/literal';

/**
 * Exact match of a field against a list of values, as ONE Elasticsearch `terms` query.
 *
 * The KQL grammar does not produce this function. Code builds it with
 * `nodeTypes.function.buildNode('terms', field, values)` when it must filter by a long list of
 * values (for example saved object ids). `field: (a or b or ...)` creates one bool clause per
 * value and hits the `indices.query.bool.max_clause_count` limit; a `terms` query is one clause
 * and accepts up to `index.max_terms_count` values (65,536 by default).
 *
 * Use it only for keyword-like fields (keyword, flattened leaves, `_id`): unlike `is`, it does
 * not analyze values and does not support wildcards.
 */
export const KQL_FUNCTION_TERMS = 'terms';

export interface KqlTermsFunctionNode extends KqlFunctionNode {
  function: typeof KQL_FUNCTION_TERMS;
  /** The field name, then one literal node per value. */
  arguments: [KqlLiteralNode, ...KqlLiteralNode[]];
}

export function isNode(node: KqlFunctionNode): node is KqlTermsFunctionNode {
  return node.function === KQL_FUNCTION_TERMS;
}

export function buildNodeParams(fieldName: string, values: KqlLiteralType[]) {
  return {
    arguments: [
      buildLiteralNode(fieldName),
      ...values.map((value) => buildLiteralNode(value, typeof value === 'string')),
    ],
  };
}

export function toElasticsearchQuery(
  node: KqlTermsFunctionNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: KqlContext = {}
): QueryDslQueryContainer {
  const [fieldNameArg, ...valueArgs] = node.arguments;
  const fieldName = literalToElasticsearchQuery(fieldNameArg) as string;
  const fullFieldName = context?.nested ? `${context.nested.path}.${fieldName}` : fieldName;
  const values = valueArgs.map((arg) => literalToElasticsearchQuery(arg));

  if (values.length === 0) {
    // An empty list matches no document. `terms` with an empty array does the same, but say it.
    return { bool: { must_not: { match_all: {} } } };
  }

  return { terms: { [fullFieldName]: values as Array<string | number | boolean> } };
}

export function toKqlExpression(node: KqlTermsFunctionNode): string {
  const [fieldNameArg, ...valueArgs] = node.arguments;
  const field = literalToKqlExpression(fieldNameArg);
  if (valueArgs.length === 0) {
    return `(${field}: * and not ${field}: *)`;
  }
  return `${field}: (${valueArgs.map(literalToKqlExpression).join(' OR ')})`;
}
