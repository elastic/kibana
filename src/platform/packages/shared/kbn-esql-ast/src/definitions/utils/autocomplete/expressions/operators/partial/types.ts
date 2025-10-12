/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../../../commands_registry/types';
import type { ESQLSingleAstItem } from '../../../../../../types';
import type { ExpressionContext, ExpressionContextOptions } from '../../types';

export interface PartialOperatorDetection {
  operatorName: string;
  syntheticNode?: ESQLSingleAstItem;
  contextOverrides?: Partial<ExpressionContext>;
  optionsOverrides?: Partial<ExpressionContextOptions>;
  // Full text before cursor - used for operator completion matching
  textBeforeCursor?: string;
}

/**
 * Detects partial operators in text and provides completion suggestions.
 */
export interface OperatorDetector {
  // Check if the operator pattern exists in the text
  detect(innerText: string): PartialOperatorDetection | null;

  getSuggestions(
    detection: PartialOperatorDetection,
    context: ExpressionContext
  ): Promise<ISuggestionItem[] | null>;
}
