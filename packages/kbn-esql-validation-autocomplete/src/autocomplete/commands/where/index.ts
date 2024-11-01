/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLCommand } from '@kbn/esql-ast';
import { GetColumnsByTypeFn, SuggestionRawDefinition } from '../../types';
import { getFunctionSuggestions } from '../../factories';

export async function suggest(
  innerText: string,
  command: ESQLCommand<'where'>,
  getColumnsByType: GetColumnsByTypeFn,
  _columnExists: (column: string) => boolean,
  getSuggestedVariableName: () => string,
  getPreferences?: () => Promise<{ histogramBarTarget: number } | undefined>
): Promise<SuggestionRawDefinition[]> {
  const columnSuggestions = await getColumnsByType('any', [], {
    advanceCursor: true,
    openSuggestions: true,
  });
  return [...columnSuggestions, ...getFunctionSuggestions({ command: 'where' })];
}
