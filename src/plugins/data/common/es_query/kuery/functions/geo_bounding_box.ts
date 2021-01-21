/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { nodeTypes } from '../node_types';
import * as ast from '../ast';
import { IIndexPattern, KueryNode, IFieldType, LatLon } from '../../..';

export function buildNodeParams(fieldName: string, params: any) {
  params = _.pick(params, 'topLeft', 'bottomRight');
  const fieldNameArg = nodeTypes.literal.buildNode(fieldName);
  const args = _.map(params, (value: LatLon, key: string) => {
    const latLon = `${value.lat}, ${value.lon}`;
    return nodeTypes.namedArg.buildNode(key, latLon);
  });

  return {
    arguments: [fieldNameArg, ...args],
  };
}

export function toElasticsearchQuery(
  node: KueryNode,
  indexPattern?: IIndexPattern,
  config: Record<string, any> = {},
  context: Record<string, any> = {}
) {
  const [fieldNameArg, ...args] = node.arguments;
  const fullFieldNameArg = {
    ...fieldNameArg,
    value: context?.nested ? `${context.nested.path}.${fieldNameArg.value}` : fieldNameArg.value,
  };
  const fieldName = nodeTypes.literal.toElasticsearchQuery(fullFieldNameArg) as string;
  const fieldList: IFieldType[] = indexPattern?.fields ?? [];
  const field = fieldList.find((fld: IFieldType) => fld.name === fieldName);

  const queryParams = args.reduce((acc: any, arg: any) => {
    const snakeArgName = _.snakeCase(arg.name);
    return {
      ...acc,
      [snakeArgName]: ast.toElasticsearchQuery(arg),
    };
  }, {});

  if (field?.scripted) {
    throw new Error(`Geo bounding box query does not support scripted fields`);
  }

  return {
    geo_bounding_box: {
      [fieldName]: queryParams,
      ignore_unmapped: true,
    },
  };
}
