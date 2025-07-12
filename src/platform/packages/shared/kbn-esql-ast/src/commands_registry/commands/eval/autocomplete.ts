/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand, ESQLSingleAstItem } from '../../../types';
import {
  pipeCompleteItem,
  commaCompleteItem,
  getNewUserDefinedColumnSuggestion,
} from '../../complete_items';
import {
  suggestForExpression,
  getExpressionPosition,
} from '../../../definitions/utils/autocomplete/helpers';
import { isExpressionComplete, getExpressionType } from '../../../definitions/utils/expressions';
import {
  type ISuggestionItem,
  type ICommandContext,
  Location,
  ICommandCallbacks,
} from '../../types';
import { isColumn, isAssignment } from '../../../ast/is';
import { getInsideFunctionsSuggestions } from '../../../definitions/utils/autocomplete/functions';
import { isMarkerNode } from '../../../definitions/utils/ast';

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
  let expressionRoot = /,\s*$/.test(innerText)
    ? undefined
    : (command.args[command.args.length - 1] as ESQLSingleAstItem | undefined);

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
  });

  const positionInExpression = getExpressionPosition(query, expressionRoot);
  if (positionInExpression === 'empty_expression' && !insideAssignment) {
    suggestions.push(
      getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || '')
    );
  }

  const functionsSpecificSuggestions = await getInsideFunctionsSuggestions(
    innerText,
    cursorPosition,
    callbacks,
    context
  );
  if (functionsSpecificSuggestions) {
    return functionsSpecificSuggestions;
  }

  if (
    // don't suggest finishing characters if incomplete expression
    isExpressionComplete(
      getExpressionType(expressionRoot, context?.fields, context?.userDefinedColumns),
      innerText
    ) &&
    // don't suggest finishing characters if the expression is a column
    // because "EVAL columnName" is a useless expression
    expressionRoot &&
    (!isColumn(expressionRoot) || insideAssignment)
  ) {
    suggestions.push(pipeCompleteItem, { ...commaCompleteItem, text: ', ' });
  }

  return suggestions;
}
