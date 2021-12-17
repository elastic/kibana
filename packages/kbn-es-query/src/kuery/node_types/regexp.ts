/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KqlNode } from './types';

export const KQL_NODE_TYPE_REGEXP = 'regexp';

export interface KqlRegexpNode extends KqlNode {
  type: typeof KQL_NODE_TYPE_REGEXP;
  value: string;
  flags: string;
}

export function isNode(node: KqlNode): node is KqlRegexpNode {
  return node.type === KQL_NODE_TYPE_REGEXP;
}

export function buildNode(value: string, flags: string): KqlRegexpNode {
  return {
    type: KQL_NODE_TYPE_REGEXP,
    value,
    flags,
  };
}

export function toQueryStringQuery({ value, flags }: KqlRegexpNode) {
  return `/${value}/${flags}`;
}

export function toElasticsearchQuery({ value, flags }: KqlRegexpNode) {
  return { value, flags };
}
