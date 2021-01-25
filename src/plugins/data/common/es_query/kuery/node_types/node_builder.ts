/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { KueryNode, nodeTypes } from '../types';

export const nodeBuilder = {
  is: (fieldName: string, value: string | KueryNode) => {
    return nodeTypes.function.buildNodeWithArgumentNodes('is', [
      nodeTypes.literal.buildNode(fieldName),
      typeof value === 'string' ? nodeTypes.literal.buildNode(value) : value,
      nodeTypes.literal.buildNode(false),
    ]);
  },
  or: ([first, ...args]: KueryNode[]): KueryNode => {
    return args.length ? nodeTypes.function.buildNode('or', [first, nodeBuilder.or(args)]) : first;
  },
  and: ([first, ...args]: KueryNode[]): KueryNode => {
    return args.length
      ? nodeTypes.function.buildNode('and', [first, nodeBuilder.and(args)])
      : first;
  },
};
