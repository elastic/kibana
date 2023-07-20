/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DataViewFieldBase, DataViewBase, KueryQueryOptions } from '../../..';
import type { KqlFunctionNode, KqlLiteralNode } from '../node_types';
import type { KqlContext } from '../types';
import {
  buildNode as buildLiteralNode,
  toElasticsearchQuery as literalToElasticsearchQuery,
  toKqlExpression as literalToKqlExpression,
} from '../node_types/literal';

export const KQL_FUNCTION_EXISTS = 'exists';

export interface KqlExistsFunctionNode extends KqlFunctionNode {
  function: typeof KQL_FUNCTION_EXISTS;
  arguments: [KqlLiteralNode];
}

export function isNode(node: KqlFunctionNode): node is KqlExistsFunctionNode {
  return node.function === KQL_FUNCTION_EXISTS;
}

export function buildNodeParams(fieldName: string) {
  return {
    arguments: [buildLiteralNode(fieldName)],
  };
}

export function toElasticsearchQuery(
  node: KqlExistsFunctionNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: KqlContext = {}
): QueryDslQueryContainer {
  const {
    arguments: [fieldNameArg],
  } = node;
  const fullFieldNameArg = {
    ...fieldNameArg,
    value: context?.nested ? `${context.nested.path}.${fieldNameArg.value}` : fieldNameArg.value,
  };
  const fieldName = literalToElasticsearchQuery(fullFieldNameArg) as string;
  const field = indexPattern?.fields?.find((fld: DataViewFieldBase) => fld.name === fieldName);

  if (field?.scripted) {
    throw new Error(`Exists query does not support scripted fields`);
  }
  return {
    exists: { field: fieldName },
  };
}

export function toKqlExpression(node: KqlExistsFunctionNode): string {
  const [field] = node.arguments;
  return `${literalToKqlExpression(field)}: *`;
}
