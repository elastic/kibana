/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import * as ast from '../ast';
import { nodeTypes } from '../node_types';
import { NamedArgTypeBuildNode } from './types';
import { JsonObject } from '../../../../../kibana_utils/common';

export function buildNode(name: string, value: any): NamedArgTypeBuildNode {
  const argumentNode =
    _.get(value, 'type') === 'literal' ? value : nodeTypes.literal.buildNode(value);
  return {
    type: 'namedArg',
    name,
    value: argumentNode,
  };
}

export function toElasticsearchQuery(node: any): JsonObject {
  return ast.toElasticsearchQuery(node.value);
}
