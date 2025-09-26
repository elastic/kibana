/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isAssignment, isColumn, isFunctionExpression } from '../../../ast/is';
import { within } from '../../../ast/location';
import { isMarkerNode } from '../../../definitions/utils/ast';
import {
  getExpressionPosition,
  suggestForExpression,
} from '../../../definitions/utils/autocomplete/helpers';
import { getExpressionType, isExpressionComplete } from '../../../definitions/utils/expressions';
import type { ESQLCommand, ESQLSingleAstItem } from '../../../types';
import {
  commaCompleteItem,
  getNewUserDefinedColumnSuggestion,
  pipeCompleteItem,
} from '../../complete_items';
import type { ICommandCallbacks } from '../../types';
import { Location, type ICommandContext, type ISuggestionItem } from '../../types';

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  if (!callbacks?.getByType) {
    return [];
  }
  const innerText = query.substring(0, cursorPosition);
  const lastArg = command.args[command.args.length - 1] as ESQLSingleAstItem | undefined;
  const startingNewExpression =
    // ends with a comma
    /,\s*$/.test(innerText) &&
    lastArg &&
    // and we aren't within a function
    !(isFunctionExpression(lastArg) && within(innerText.length, lastArg));

  let expressionRoot = startingNewExpression ? undefined : lastArg;

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
    innerText,
    getColumnsByType: callbacks?.getByType,
    expressionRoot,
    location: Location.EVAL,
    context,
    hasMinimumLicenseRequired: callbacks?.hasMinimumLicenseRequired,
    activeProduct: context?.activeProduct,
  });

  const positionInExpression = getExpressionPosition(query, expressionRoot);
  if (positionInExpression === 'empty_expression' && !insideAssignment) {
    suggestions.push(
      getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || '')
    );
  }

  if (
    // don't suggest finishing characters if incomplete expression
    isExpressionComplete(getExpressionType(expressionRoot, context?.columns), innerText) &&
    // don't suggest finishing characters if the expression is a column
    // because "EVAL columnName" is a useless expression
    expressionRoot &&
    (!isColumn(expressionRoot) || insideAssignment)
  ) {
    suggestions.push(pipeCompleteItem, { ...commaCompleteItem, text: ', ' });
  }

  return suggestions;
}
