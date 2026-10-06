/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstAllCommands, ESQLSingleAstItem } from '@elastic/esql/types';
import type { ISuggestionItem } from '../types';
export type SortPosition =
  | 'expression'
  | 'order_complete'
  | 'after_order'
  | 'nulls_complete'
  | 'after_nulls';
export declare const getSortPos: (
  query: string,
  command: ESQLAstAllCommands
) => {
  position: SortPosition | undefined;
  expressionRoot: ESQLSingleAstItem | undefined;
};
export declare const sortModifierSuggestions: {
  ASC: ISuggestionItem;
  DESC: ISuggestionItem;
  NULLS_FIRST: ISuggestionItem;
  NULLS_LAST: ISuggestionItem;
};
export declare const rightAfterColumn: (
  innerText: string,
  expressionRoot: ESQLSingleAstItem | undefined,
  columnExists: (name: string) => boolean
) => boolean;
export declare const getSuggestionsAfterCompleteExpression: (
  innerText: string,
  expressionRoot: ESQLSingleAstItem | undefined,
  columnExists: (name: string) => boolean
) => ISuggestionItem[];
