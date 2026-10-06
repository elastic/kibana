/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstHeaderCommand } from '@elastic/esql/types';
import type { UnmappedFieldsStrategy } from '../../registry/types';
import { type ISuggestionItem } from '../../registry/types';
export declare function getSettingsCompletionItems(isServerless?: boolean): ISuggestionItem[];
/**
 * Checks the headers commmands looking for an unmapped_fields setting and returns its strategy value.
 * Default is DEFAULT.
 */
export declare function getUnmappedFieldsStrategy(
  headers?: ESQLAstHeaderCommand[]
): UnmappedFieldsStrategy;
/**
 * Returns the type to be assigned to unmapped fields based on the provided strategy.
 */
export declare function getUnmappedFieldType(
  unmappedFieldsStrategy: UnmappedFieldsStrategy
): string;
