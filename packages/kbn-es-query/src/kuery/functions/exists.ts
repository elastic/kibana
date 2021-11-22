/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewBase, DataViewFieldBase, DslQuery, KueryQueryOptions } from '../..';
import type { KqlFunctionNode } from '../node_types/function';
import type { KqlLiteralNode } from '../node_types/literal';
import type { KqlWildcardNode } from '../node_types/wildcard';
import type { KqlContext } from '../types';
import * as ast from '../ast';

export const KQL_FUNCTION_NAME_EXISTS = 'exists';

export interface KqlExistsFunctionNode extends KqlFunctionNode {
  function: typeof KQL_FUNCTION_NAME_EXISTS;
  arguments: [
    KqlLiteralNode | KqlWildcardNode // Field name
  ];
}

export function isNode(node: KqlFunctionNode): node is KqlExistsFunctionNode {
  return node.function === KQL_FUNCTION_NAME_EXISTS;
}

export function toElasticsearchQuery(
  { arguments: [fieldNameArg] }: KqlExistsFunctionNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: KqlContext = {}
): DslQuery {
  const fullFieldNameArg = {
    ...fieldNameArg,
    value: context?.nested ? `${context.nested.path}.${fieldNameArg.value}` : fieldNameArg.value,
  };
  const fieldName = `${ast.toElasticsearchQuery(fullFieldNameArg)}`;
  const field = indexPattern?.fields?.find((fld: DataViewFieldBase) => fld.name === fieldName);

  if (field?.scripted) {
    throw new Error(`Exists query does not support scripted fields`);
  }

  return { exists: { field: fieldName } };
}
