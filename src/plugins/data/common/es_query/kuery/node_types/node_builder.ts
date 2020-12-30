/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
