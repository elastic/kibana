/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SupportedDataType } from '../../../../../types';
import type { ExpressionContext, FunctionParameterContext } from '../../types';
export interface OperatorRuleContext {
  expressionType: SupportedDataType | 'unknown';
  functionParameterContext?: FunctionParameterContext;
  ctx: ExpressionContext;
}
export interface OperatorDecision {
  shouldSuggest: boolean;
  allowedOperators?: string[];
  reason?: string;
}
/** Determines whether operators should be suggested for the current context. */
export declare function shouldSuggestOperators(context: OperatorRuleContext): OperatorDecision;
