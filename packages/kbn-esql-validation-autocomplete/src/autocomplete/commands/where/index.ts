/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstItem, ESQLCommand } from '@kbn/esql-ast';
import type { SupportedDataType } from '../../../definitions/types';
import { endsInWhitespace, isColumnItem } from '../../../shared/helpers';
import type { GetColumnsByTypeFn, SuggestionRawDefinition } from '../../types';
import { getFunctionSuggestions, getOperatorSuggestions } from '../../factories';

export async function suggest(
  innerText: string,
  command: ESQLCommand<'where'>,
  getColumnsByType: GetColumnsByTypeFn,
  columnExists: (column: string) => boolean,
  _getSuggestedVariableName: () => string,
  getExpressionType: (expression: ESQLAstItem) => SupportedDataType | 'unknown',
  _getPreferences?: () => Promise<{ histogramBarTarget: number } | undefined>
): Promise<SuggestionRawDefinition[]> {
  const lastArg = command.args[command.args.length - 1];
  if (isColumnItem(lastArg) && endsInWhitespace(innerText)) {
    const columnType = getExpressionType(lastArg);
    if (columnType === 'unknown' || columnType === 'unsupported') {
      return [];
    }
    // skip assign operator if the column exists so as not to promote shadowing
    const ignoredOperators = columnExists(lastArg.parts.join('.')) ? ['='] : [];

    return getOperatorSuggestions({
      command: 'where',
      leftParamType: columnType,
      ignored: ignoredOperators,
    });
  }

  const columnSuggestions = await getColumnsByType('any', [], {
    advanceCursor: true,
    openSuggestions: true,
  });
  return [...columnSuggestions, ...getFunctionSuggestions({ command: 'where' })];
}
