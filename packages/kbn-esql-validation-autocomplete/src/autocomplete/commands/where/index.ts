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
import { isParameterType, type SupportedDataType } from '../../../definitions/types';
import { endsInWhitespace, isColumnItem, isFunctionItem } from '../../../shared/helpers';
import type { GetColumnsByTypeFn, SuggestionRawDefinition } from '../../types';
import {
  getFunctionSuggestions,
  getOperatorSuggestions,
  getSuggestionsAfterNot,
} from '../../factories';
import { getSuggestionsToRightOfOperatorExpression } from '../../helper';

export async function suggest(
  innerText: string,
  command: ESQLCommand<'where'>,
  getColumnsByType: GetColumnsByTypeFn,
  _columnExists: (column: string) => boolean,
  _getSuggestedVariableName: () => string,
  getExpressionType: (expression: ESQLAstItem) => SupportedDataType | 'unknown',
  _getPreferences?: () => Promise<{ histogramBarTarget: number } | undefined>
): Promise<SuggestionRawDefinition[]> {
  const lastArg = command.args[command.args.length - 1] as ESQLSingleAstItem;

  /**
   * Suggest after a column name
   */
  if (isColumnItem(lastArg) && endsInWhitespace(innerText)) {
    const columnType = getExpressionType(lastArg);

    if (!isParameterType(columnType)) {
      return [];
    }

    return getOperatorSuggestions({
      command: 'where',
      leftParamType: columnType,
      // no assignments allowed in WHERE
      ignored: ['='],
    });
  }

  /**
   * Suggest after a complete (non-operator) function call
   */
  if (
    isFunctionItem(lastArg) &&
    lastArg.subtype === 'variadic-call' &&
    endsInWhitespace(innerText)
  ) {
    const returnType = getExpressionType(lastArg);

    if (!isParameterType(returnType)) {
      return [];
    }

    return getOperatorSuggestions({
      command: 'where',
      leftParamType: returnType,
      ignored: ['='],
    });
  }

  /**
   * Suggest after a NOT keyword
   *
   * the NOT function is a special operator that can be used in different ways,
   * and not all these are mapped within the AST data structure: in particular
   * <COMMAND> <field> NOT <here>
   * is an incomplete statement and it results in a missing AST node, so we need to detect
   * from the query string itself
   *
   * TODO - revisit
   */
  const endsWithNot = / not$/i.test(innerText.trimEnd());
  if (endsWithNot) {
    if (!command.args.some((arg) => isFunctionItem(arg) && arg.name === 'not')) {
      return getSuggestionsAfterNot();
    } else {
      return [
        ...getFunctionSuggestions({ command: 'where', returnTypes: ['boolean'] }),
        ...(await getColumnsByType('boolean', [], { advanceCursor: true, openSuggestions: true })),
      ];
    }
  }

  /**
   * This branch deals with operators
   */
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
        if (fn.location.min > rightmostOperator.location.min && fn.subtype !== 'variadic-call')
          rightmostOperator = fn;
      },
    });
    walker.walkFunction(lastArg);

    return getSuggestionsToRightOfOperatorExpression({
      queryText: innerText,
      commandName: 'where',
      rootOperator: rightmostOperator,
      preferredExpressionType: 'boolean',
      getExpressionType,
      getColumnsByType,
    });
  }

  const columnSuggestions = await getColumnsByType('any', [], {
    advanceCursor: true,
    openSuggestions: true,
  });
  return [...columnSuggestions, ...getFunctionSuggestions({ command: 'where' })];
}
