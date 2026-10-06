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
/**
 * Handles IS NULL / IS NOT NULL partial operators.
 * Generates suggestions directly without creating synthetic nodes.
 * Supports prefix matching: "IS N" suggests both IS NULL and IS NOT NULL.
 */
export declare function handleNullCheckOperator(
  { textBeforeCursor }: PartialOperatorDetection,
  { innerText }: ExpressionContext
): Promise<ISuggestionItem[] | null>;
export declare function handleLikeOperator(
  detection: PartialOperatorDetection,
  context: ExpressionContext
): Promise<ISuggestionItem[] | null>;
export declare function handleInOperator(
  detection: PartialOperatorDetection,
  context: ExpressionContext
): Promise<ISuggestionItem[] | null>;
