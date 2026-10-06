/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../../registry/types';
import type { ExpressionContext } from '../types';
/**
 * Handler for autocomplete suggestions after complete expressions.
 * Handles after_complete position for all complete expression types:
 * - Columns (e.g., "field /")
 * - Functions (e.g., "ABS(x) /")
 * - Literals (e.g., "123 /" or "true /")
 * - Postfix operators (e.g., "field IS NULL /")
 *
 * Boolean literals (true/false) have special operator filtering logic.
 */
export declare function suggestAfterComplete(ctx: ExpressionContext): Promise<ISuggestionItem[]>;
