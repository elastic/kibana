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
 * Suggests completions after an operator (e.g., field = |, field IN |)
 * Handles special cases (IN, IS NULL) or delegates to generic operator logic
 */
export declare function suggestAfterOperator(ctx: ExpressionContext): Promise<ISuggestionItem[]>;
