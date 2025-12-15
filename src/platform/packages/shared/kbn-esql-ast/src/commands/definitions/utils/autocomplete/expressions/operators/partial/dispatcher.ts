/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../../../registry/types';
import type { ExpressionContext, PartialOperatorDetection } from '../../types';
import { handleNullCheckOperator, handleLikeOperator, handleInOperator } from './handlers';

type PartialOperatorHandler = (
  detection: PartialOperatorDetection,
  context: ExpressionContext
) => Promise<ISuggestionItem[] | null>;

const PARTIAL_OPERATOR_HANDLERS: Record<string, PartialOperatorHandler> = {
  in: handleInOperator,
  'not in': handleInOperator,
  like: handleLikeOperator,
  rlike: handleLikeOperator,
  'not like': handleLikeOperator,
  'not rlike': handleLikeOperator,
  'is null': handleNullCheckOperator,
  'is not null': handleNullCheckOperator,
};

/**
 * Dispatches partial operator detection to appropriate handler.
 */
export async function dispatchPartialOperators(
  operatorName: string,
  detection: PartialOperatorDetection,
  context: ExpressionContext
): Promise<ISuggestionItem[] | null> {
  const handler = PARTIAL_OPERATOR_HANDLERS[operatorName];

  return handler ? handler(detection, context) : null;
}
