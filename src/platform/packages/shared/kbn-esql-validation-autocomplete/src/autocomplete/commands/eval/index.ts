/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSingleAstItem } from '@kbn/esql-ast';
import { isMarkerNode } from '../../../shared/context';
import { isAssignment, isColumnItem } from '../../../..';
import { CommandSuggestParams } from '../../../definitions/types';
import type { SuggestionRawDefinition } from '../../types';
import { getNewVariableSuggestion } from '../../factories';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';
import { buildPartialMatcher, getExpressionPosition, suggestForExpression } from '../../helper';

const isNullMatcher = buildPartialMatcher('is nul');
const isNotNullMatcher = buildPartialMatcher('is not nul');

export async function suggest(
  params: CommandSuggestParams<'eval'>
): Promise<SuggestionRawDefinition[]> {
  let expressionRoot = /,\s*$/.test(params.innerText)
    ? undefined
    : (params.command.args[params.command.args.length - 1] as ESQLSingleAstItem | undefined);

  let insideAssignment = false;
  if (expressionRoot && isAssignment(expressionRoot)) {
    // EVAL foo = <use this as the expression root>
    expressionRoot = (expressionRoot.args[1] as ESQLSingleAstItem[])[0] as ESQLSingleAstItem;
    insideAssignment = true;

    if (isMarkerNode(expressionRoot)) {
      expressionRoot = undefined;
    }
  }

  const suggestions = await suggestForExpression({
    ...params,
    expressionRoot,
    commandName: 'eval',
  });

  const positionInExpression = getExpressionPosition(params.innerText, expressionRoot);
  if (positionInExpression === 'empty_expression' && !insideAssignment) {
    suggestions.push(getNewVariableSuggestion(params.getSuggestedVariableName()));
  }

  const isExpressionComplete =
    params.getExpressionType(expressionRoot) !== 'unknown' &&
    // see https://github.com/elastic/kibana/issues/199401
    // for the reason we need this string check.
    !(isNullMatcher.test(params.innerText) || isNotNullMatcher.test(params.innerText));

  if (
    // don't suggest finishing characters if incomplete expression
    isExpressionComplete &&
    // don't suggest finishing characters if the expression is a column
    // because "EVAL columnName" is a useless expression
    expressionRoot &&
    !isColumnItem(expressionRoot)
  ) {
    suggestions.push(pipeCompleteItem, { ...commaCompleteItem, text: ', ' });
  }

  return suggestions;
}
