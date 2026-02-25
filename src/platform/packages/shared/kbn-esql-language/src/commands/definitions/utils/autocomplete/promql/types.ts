/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PromQLAstNode,
  PromQLBinaryExpression,
  PromQLFunction,
  PromQLSelector,
} from '../../../../../embedded_languages/promql/types';
import type { PromQLFunctionParamType } from '../../../types';

// ============================================================================
// Cursor context
// ============================================================================

export interface CursorMatch {
  node: PromQLAstNode;
  parent: PromQLAstNode | undefined;
}

export interface CursorContext {
  match: CursorMatch | undefined;
  innermostFunc: PromQLFunction | undefined;
  outermostIncompleteBinary: PromQLBinaryExpression | undefined;
}

// ============================================================================
// Query detailed position
// ============================================================================

export type PromqlDetailedPositionType =
  | 'after_command'
  | 'after_param_keyword'
  | 'after_param_equals'
  | 'inside_query'
  | 'after_query'
  | 'after_operator'
  | 'inside_grouping'
  | 'inside_function_args'
  | 'after_complete_arg'
  | 'after_label_brace'
  | 'after_label_name'
  | 'after_label_operator'
  | 'after_label_selector'
  | 'after_metric';

export interface PromqlDetailedPosition {
  type: PromqlDetailedPositionType;
  currentParam?: string;
  canAddGrouping?: boolean;
  isAfterAggregationName?: boolean;
  selector?: PromQLSelector;
  canSuggestRangeSelector?: boolean;
  isCompleteLabel?: boolean;
  canSuggestCommaInFunctionArgs?: boolean;
  signatureTypes?: PromQLFunctionParamType[];
}
