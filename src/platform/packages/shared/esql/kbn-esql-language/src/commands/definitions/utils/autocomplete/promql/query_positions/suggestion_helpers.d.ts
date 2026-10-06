/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type PromQLFunctionParamType } from '../../../../types';
import type { ICommandContext, ISuggestionItem } from '../../../../../registry/types';
/** Builds field/function suggestions for vector-like argument contexts. */
export declare function buildVectorSuggestions(
  columns: ICommandContext['columns'] | undefined,
  signatureTypes: PromQLFunctionParamType[],
  wrap: boolean
): ISuggestionItem[];
/** Suggests tokens immediately after a complete query expression. */
export declare function buildNextActionsSuggestion(input: {
  columns: ICommandContext['columns'] | undefined;
  shouldWrap: boolean;
  preGroupedAgg?: string;
  isAfterAggregationName: boolean;
  canAddGrouping: boolean;
}): ISuggestionItem[];
export declare function buildFieldSuggestions(
  columns: ICommandContext['columns'] | undefined,
  types: readonly string[] | undefined,
  wrap: 'wrap' | 'plain'
): ISuggestionItem[];
/** Returns a cached comma suggestion wrapped with autosuggest metadata. */
export declare const buildCommaWithAutoSuggest: () => ISuggestionItem;
