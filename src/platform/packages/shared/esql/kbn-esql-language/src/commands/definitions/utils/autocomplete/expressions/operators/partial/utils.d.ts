/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLFunction, ESQLSingleAstItem } from '@elastic/esql/types';
import type { PartialOperatorDetection } from '../../types';
export declare function createSyntheticListOperatorNode(
  operatorName: string,
  innerText: string,
  leftOperand?: ESQLSingleAstItem
): ESQLFunction;
export declare function createSyntheticLikeOperatorNode(
  operatorName: string,
  innerText: string,
  leftOperand?: ESQLSingleAstItem
): ESQLFunction;
/**
 * Detects partial IS NULL / IS NOT NULL operators.
 * Examples: "field IS ", "field IS N", "field IS NOT ", "field IS NOT N"
 */
export declare function detectNullCheck(innerText: string): PartialOperatorDetection | null;
/**
 * Detects partial LIKE / RLIKE / NOT LIKE / NOT RLIKE operators.
 * Examples: "field LIKE ", "field RLIKE ", "field NOT LIKE ", "field NOT RLIKE "
 */
export declare function detectLike(innerText: string): PartialOperatorDetection | null;
/**
 * Detects partial IN / NOT IN operators.
 * Examples: "field IN ", "field IN(", "field NOT IN ", "field NOT IN("
 */
export declare function detectIn(innerText: string): PartialOperatorDetection | null;
