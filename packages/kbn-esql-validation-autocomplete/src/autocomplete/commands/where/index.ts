/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  Walker,
  type ESQLAstItem,
  type ESQLCommand,
  type ESQLSingleAstItem,
  type ESQLFunction,
} from '@kbn/esql-ast';
import type { SupportedDataType } from '../../../definitions/types';
import { endsInWhitespace, isColumnItem, isFunctionItem } from '../../../shared/helpers';
import type { GetColumnsByTypeFn, SuggestionRawDefinition } from '../../types';
import { getFunctionSuggestions, getOperatorSuggestions } from '../../factories';
import { getSuggestionsToRightOfOperatorExpression } from '../../helper';

export async function suggest(
  innerText: string,
  command: ESQLCommand<'where'>,
  getColumnsByType: GetColumnsByTypeFn,
  columnExists: (column: string) => boolean,
  _getSuggestedVariableName: () => string,
  getExpressionType: (expression: ESQLAstItem) => SupportedDataType | 'unknown',
  _getPreferences?: () => Promise<{ histogramBarTarget: number } | undefined>
): Promise<SuggestionRawDefinition[]> {
  const lastArg = command.args[command.args.length - 1] as ESQLSingleAstItem;
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

  if (isFunctionItem(lastArg) && lastArg.subtype !== 'variadic-call') {
    // 1 + 1 /
    // 1 + 1 + /
    // 1 + 1 AND foo + /
    // 1 AND foo + 1 OR 3 + /
    // 1 AND foo IS NOT NULL /
    // keywordField >= keywordField ${op} doubleField /

    let rightmostOperator = lastArg;
    // get rightmost function
    const walker = new Walker({
      visitFunction: (fn: ESQLFunction) => {
        if (fn.location.min > rightmostOperator.location.min) rightmostOperator = fn;
      },
    });
    walker.walkFunction(lastArg);

    return getSuggestionsToRightOfOperatorExpression(
      innerText,
      'where',
      undefined,
      rightmostOperator,
      getExpressionType,
      getColumnsByType
    );
  }

  const columnSuggestions = await getColumnsByType('any', [], {
    advanceCursor: true,
    openSuggestions: true,
  });
  return [...columnSuggestions, ...getFunctionSuggestions({ command: 'where' })];
}
