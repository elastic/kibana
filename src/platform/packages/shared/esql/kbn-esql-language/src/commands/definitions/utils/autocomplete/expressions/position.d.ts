/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSingleAstItem } from '@elastic/esql/types';
import type { ESQLColumnData } from '../../../../registry/types';
export type ExpressionPosition =
  | 'in_function'
  | 'after_not'
  | 'after_operator'
  | 'after_complete'
  | 'after_cast'
  | 'empty_expression';
/** Determines the position of the cursor within an expression */
export declare function getPosition(
  innerText: string,
  expressionRoot: ESQLSingleAstItem | undefined,
  columns?: Map<string, ESQLColumnData>
): ExpressionPosition;
