/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type ESQLAstItem, ESQLAst } from '@kbn/esql-ast';
import { ESQLCommand } from '@kbn/esql-ast/src/types';
import { type SupportedDataType } from '../../../definitions/types';
import type { GetColumnsByTypeFn, SuggestionRawDefinition } from '../../types';

export async function suggest(
  innerText: string,
  command: ESQLCommand<'join'>,
  getColumnsByType: GetColumnsByTypeFn,
  _columnExists: (column: string) => boolean,
  _getSuggestedVariableName: () => string,
  getExpressionType: (expression: ESQLAstItem | undefined) => SupportedDataType | 'unknown',
  _getPreferences?: () => Promise<{ histogramBarTarget: number } | undefined>,
  fullTextAst?: ESQLAst
): Promise<SuggestionRawDefinition[]> {
  const suggestions: SuggestionRawDefinition[] = [];

  console.log('suggestions...');

  return suggestions;
}
