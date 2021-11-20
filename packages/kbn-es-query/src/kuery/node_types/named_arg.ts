/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { JsonObject } from '@kbn/utility-types';
import * as ast from '../ast';
import { nodeTypes } from '../node_types';
import { NamedArgTypeBuildNode } from './types';

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
