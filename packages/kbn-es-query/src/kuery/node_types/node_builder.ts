/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KueryNode, nodeTypes } from '../types';

export const nodeBuilder = {
  is: (fieldName: string, value: string | KueryNode) => {
    return nodeTypes.function.buildNodeWithArgumentNodes('is', [
      nodeTypes.literal.buildNode(fieldName),
      typeof value === 'string' ? nodeTypes.literal.buildNode(value) : value,
    ]);
  },
  or: (nodes: KueryNode[]): KueryNode => {
    return nodes.length > 1 ? nodeTypes.function.buildNode('or', nodes) : nodes[0];
  },
  and: (nodes: KueryNode[]): KueryNode => {
    return nodes.length > 1 ? nodeTypes.function.buildNode('and', nodes) : nodes[0];
  },
};
