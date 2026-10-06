/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstItem, ESQLAstMmrCommand, ESQLCommand } from '@elastic/esql/types';
import type { ICommandCallbacks, ICommandContext, ISuggestionItem } from '../types';
export declare enum MmrPosition {
  AFTER_MMR_KEYWORD = 'after_mmr_keyword',
  AFTER_ON_KEYWORD = 'after_on_keyword',
  AFTER_FIELD = 'after_field',
  AFTER_LIMIT_KEYWORD = 'after_limit_keyword',
  AFTER_LIMIT_VALUE = 'after_limit_value',
  AFTER_WITH_KEYWORD = 'after_with_keyword',
  WITHIN_OPTIONS = 'within_options',
  AFTER_COMMAND = 'after_command',
}
export declare const MMR_VECTOR_TYPES: string[];
export declare const getItemLocation: (
  item: ESQLAstItem | undefined,
  fallback: ESQLCommand['location']
) => import('@elastic/esql-types').ESQLLocation;
export declare function getVectorFieldSuggestions(
  innerText: string,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext
): Promise<ISuggestionItem[]>;
export declare function getPosition(command: ESQLAstMmrCommand): MmrPosition;
