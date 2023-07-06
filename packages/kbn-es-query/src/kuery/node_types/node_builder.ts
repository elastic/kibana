/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RangeFilterParams } from '../../filters';
import { KueryNode, nodeTypes } from '../types';

export const nodeBuilder = {
  is: (fieldName: string, value: string | KueryNode): KueryNode => {
    return nodeTypes.function.buildNodeWithArgumentNodes('is', [
      nodeTypes.literal.buildNode(fieldName),
      typeof value === 'string' ? nodeTypes.literal.buildNode(value) : value,
    ]);
  },
  or: (nodes: KueryNode[]): KueryNode => {
    return nodes.length === 1 ? nodes[0] : nodeTypes.function.buildNode('or', nodes);
  },
  and: (nodes: KueryNode[]): KueryNode => {
    return nodes.length === 1 ? nodes[0] : nodeTypes.function.buildNode('and', nodes);
  },
  range: (
    fieldName: string,
    operator: keyof Pick<RangeFilterParams, 'gt' | 'gte' | 'lt' | 'lte'>,
    value: number | string
  ): KueryNode => {
    return nodeTypes.function.buildNodeWithArgumentNodes('range', [
      nodeTypes.literal.buildNode(fieldName),
      operator,
      typeof value === 'string' ? nodeTypes.literal.buildNode(value) : value,
    ]);
  },
};
