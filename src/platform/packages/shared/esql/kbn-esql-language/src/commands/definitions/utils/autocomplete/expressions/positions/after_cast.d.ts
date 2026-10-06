/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SupportedDataType } from '../../../../..';
import type { ISuggestionItem } from '../../../../../registry/types';
import type { ExpressionContext } from '../types';
/**
 * Suggests completions after the cast (::) keyword.
 * We suggest only casting types that can be applied to the value being casted.
 */
export declare function suggestAfterCast(ctx: ExpressionContext): Promise<ISuggestionItem[]>;
/**
 * Returns suggestions for inline casts.
 * If sourceType is provided, only returns casting types that can be applied to it.
 */
export declare function getCastingTypesSuggestions(
  typeBeingCasted?: SupportedDataType
): ISuggestionItem[];
