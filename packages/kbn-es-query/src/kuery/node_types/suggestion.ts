/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KqlNode } from './types';

export const KQL_NODE_TYPE_SUGGESTION = 'cursor';

export type KqlLiteralType = null | boolean | number | string;
export type KqlSuggestionType = 'value' | 'conjunction' | 'operator' | 'field';

/**
 * KQL node representing a point in the AST where autocomplete suggestions should be provided (only
 * returned if `parseCursor` is `true` in `fromKueryExpression`)
 */
export interface KqlSuggestionNode extends KqlNode {
  type: typeof KQL_NODE_TYPE_SUGGESTION;
  start: number;
  end: number;
  prefix: string;
  suffix: string;
  text: string;
  suggestionTypes: KqlSuggestionType[];
  fieldName?: string;
  nestedPath?: string;
}

export function isNode(node: KqlNode): node is KqlSuggestionNode {
  return node.type === KQL_NODE_TYPE_SUGGESTION;
}

export function buildNode(args: Omit<KqlSuggestionNode, 'type'>): KqlSuggestionNode {
  return {
    type: KQL_NODE_TYPE_SUGGESTION,
    ...args,
  };
}

export function toElasticsearchQuery(): never {
  throw new Error('KQL suggestion nodes are for offering autocomplete suggestions only');
}
