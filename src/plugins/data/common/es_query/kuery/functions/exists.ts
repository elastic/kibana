/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { get } from 'lodash';
import * as literal from '../node_types/literal';
import { IIndexPattern, KueryNode, IFieldType } from '../../..';

export function buildNodeParams(fieldName: string) {
  return {
    arguments: [literal.buildNode(fieldName)],
  };
}

export function toElasticsearchQuery(
  node: KueryNode,
  indexPattern?: IIndexPattern,
  config: Record<string, any> = {},
  context: Record<string, any> = {}
) {
  const {
    arguments: [fieldNameArg],
  } = node;
  const fullFieldNameArg = {
    ...fieldNameArg,
    value: context?.nested ? `${context.nested.path}.${fieldNameArg.value}` : fieldNameArg.value,
  };
  const fieldName = literal.toElasticsearchQuery(fullFieldNameArg);
  const field = get(indexPattern, 'fields', []).find((fld: IFieldType) => fld.name === fieldName);

  if (field && (field as IFieldType).scripted) {
    throw new Error(`Exists query does not support scripted fields`);
  }
  return {
    exists: { field: fieldName },
  };
}
