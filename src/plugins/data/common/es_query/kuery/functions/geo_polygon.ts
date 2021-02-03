/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { nodeTypes } from '../node_types';
import * as ast from '../ast';
import { IIndexPattern, KueryNode, IFieldType, LatLon } from '../../..';
import { LiteralTypeBuildNode } from '../node_types/types';

export function buildNodeParams(fieldName: string, points: LatLon[]) {
  const fieldNameArg = nodeTypes.literal.buildNode(fieldName);
  const args = points.map((point) => {
    const latLon = `${point.lat}, ${point.lon}`;
    return nodeTypes.literal.buildNode(latLon);
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
  const [fieldNameArg, ...points] = node.arguments;
  const fullFieldNameArg = {
    ...fieldNameArg,
    value: context?.nested ? `${context.nested.path}.${fieldNameArg.value}` : fieldNameArg.value,
  };
  const fieldName = nodeTypes.literal.toElasticsearchQuery(fullFieldNameArg) as string;
  const fieldList: IFieldType[] = indexPattern?.fields ?? [];
  const field = fieldList.find((fld: IFieldType) => fld.name === fieldName);
  const queryParams = {
    points: points.map((point: LiteralTypeBuildNode) => {
      return ast.toElasticsearchQuery(point, indexPattern, config, context);
    }),
  };

  if (field?.scripted) {
    throw new Error(`Geo polygon query does not support scripted fields`);
  }

  return {
    geo_polygon: {
      [fieldName]: queryParams,
      ignore_unmapped: true,
    },
  };
}
