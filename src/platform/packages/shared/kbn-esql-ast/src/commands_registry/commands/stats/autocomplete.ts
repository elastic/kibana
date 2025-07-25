/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQLVariableType } from '@kbn/esql-types';
import { isAssignment } from '../../../ast/is';
import { ICommandCallbacks, Location } from '../../types';
import type {
  ESQLCommand,
  ESQLCommandOption,
  ESQLColumn,
  ESQLFunction,
  ESQLAstItem,
} from '../../../types';
import { type ISuggestionItem, type ICommandContext } from '../../types';
import { getFunctionSuggestions } from '../../../definitions/utils/functions';
import {
  pipeCompleteItem,
  byCompleteItem,
  whereCompleteItem,
  commaCompleteItem,
  getNewUserDefinedColumnSuggestion,
  getDateHistogramCompletionItem,
} from '../../complete_items';
import {
  columnExists,
  getControlSuggestionIfSupported,
  suggestForExpression,
} from '../../../definitions/utils/autocomplete/helpers';
import { isExpressionComplete, getExpressionType } from '../../../definitions/utils/expressions';
import { ESQL_VARIABLES_PREFIX } from '../../constants';
import { getPosition, getSuggestionsAfterCompleteExpression } from './utils';
// import { getInsideFunctionsSuggestions } from '../../../definitions/utils/autocomplete/functions';
import { isMarkerNode } from '../../../definitions/utils/ast';

function alreadyUsedColumns(command: ESQLCommand) {
  const byOption = command.args.find((arg) => !Array.isArray(arg) && arg.name === 'by') as
    | ESQLCommandOption
    | undefined;

  const columnNodes = (byOption?.args.filter(
    (arg) => !Array.isArray(arg) && arg.type === 'column'
  ) ?? []) as ESQLColumn[];

  return columnNodes.map((node) => node.parts.join('.'));
}

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
  const pos = getPosition(innerText, command);

  const lastCharacterTyped = innerText[innerText.length - 1];
  const controlSuggestions = getControlSuggestionIfSupported(
    Boolean(context?.supportsControls),
    ESQLVariableType.FUNCTIONS,
    context?.variables,
    lastCharacterTyped !== ESQL_VARIABLES_PREFIX
  );

  // TODO: reenable
  // const functionsSpecificSuggestions = await getInsideFunctionsSuggestions(
  //   query,
  //   cursorPosition,
  //   callbacks,
  //   context
  // );
  // if (functionsSpecificSuggestions) {
  //   return functionsSpecificSuggestions;
  // }

  switch (pos) {
    case 'expression_without_assignment': {
      const expressionRoot = /,\s*$/.test(innerText)
        ? undefined // we're in a new expression, but there isn't an AST node for it yet
        : command.args[command.args.length - 1];

      if (Array.isArray(expressionRoot)) {
        return [];
      }

      const suggestions = await suggestForExpression({
        innerText,
        expressionRoot,
        location: Location.STATS,
        context,
        hasMinimumLicenseRequired: callbacks?.hasMinimumLicenseRequired,
      });

      if (!expressionRoot) {
        suggestions.push(
          getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || '')
        );
      }

      if (isExpressionComplete(getExpressionType(expressionRoot, context?.fields), innerText)) {
        suggestions.push(
          ...getSuggestionsAfterCompleteExpression(innerText, expressionRoot, columnExists),
          whereCompleteItem,
          byCompleteItem
        );
      }

      return suggestions;

      // TODO: control suggestions

      return [
        ...controlSuggestions,
        ...getFunctionSuggestions(
          { location: Location.STATS },
          callbacks?.hasMinimumLicenseRequired
        ),
        getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || ''),
      ];
    }

    case 'expression_after_assignment': {
      // Find expression root
      const byNode = command.args[command.args.length - 1] as ESQLCommandOption;
      const assignment = byNode.args[byNode.args.length - 1];
      const rightHandAssignment = isAssignment(assignment)
        ? assignment.args[assignment.args.length - 1]
        : undefined;
      let expressionRoot = Array.isArray(rightHandAssignment) ? rightHandAssignment[0] : undefined;

      // @TODO the marker shouldn't be leaking through here
      if (isMarkerNode(expressionRoot)) {
        expressionRoot = undefined;
      }

      if (Array.isArray(expressionRoot)) {
        return [];
      }

      const suggestions = await suggestForExpression({
        innerText,
        expressionRoot,
        location: Location.STATS,
        context,
        hasMinimumLicenseRequired: callbacks?.hasMinimumLicenseRequired,
      });

      if (!expressionRoot) {
        suggestions.push(
          getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || '')
        );
      }

      if (isExpressionComplete(getExpressionType(expressionRoot, context?.fields), innerText)) {
        suggestions.push(
          ...getSuggestionsAfterCompleteExpression(innerText, expressionRoot, columnExists),
          whereCompleteItem,
          byCompleteItem
        );
      }

      return suggestions;

      // TODO reinstate control suggestions

      return [
        ...controlSuggestions,
        ...getFunctionSuggestions(
          { location: Location.STATS },
          callbacks?.hasMinimumLicenseRequired
        ),
      ];
    }

    case 'after_where': {
      const whereFn = command.args[command.args.length - 1] as ESQLFunction;
      // TODO do we still need this check?
      const expressionRoot = isMarkerNode(whereFn.args[1]) ? undefined : whereFn.args[1]!;

      if (expressionRoot && !!Array.isArray(expressionRoot)) {
        return [];
      }

      const suggestions = await suggestForExpression({
        innerText,
        getColumnsByType: callbacks?.getByType,
        expressionRoot,
        location: Location.STATS_WHERE,
        preferredExpressionType: 'boolean',
        context,
        hasMinimumLicenseRequired: callbacks?.hasMinimumLicenseRequired,
      });

      // Is this a complete boolean expression?
      // If so, we can call it done and suggest a pipe
      const expressionType = getExpressionType(
        expressionRoot,
        context?.fields,
        context?.userDefinedColumns
      );
      if (expressionType === 'boolean' && isExpressionComplete(expressionType, innerText)) {
        suggestions.push(pipeCompleteItem, { ...commaCompleteItem, text: ', ' }, byCompleteItem);
      }

      return suggestions;
    }

    case 'grouping_expression_after_assignment': {
      const histogramBarTarget = context?.histogramBarTarget ?? 0;

      // TODO - incorporate columns to ignore
      const ignored = alreadyUsedColumns(command);

      // Find expression root
      const byNode = command.args[command.args.length - 1] as ESQLCommandOption;
      const assignment = byNode.args[byNode.args.length - 1];
      const rightHandAssignment = isAssignment(assignment)
        ? assignment.args[assignment.args.length - 1]
        : undefined;
      let expressionRoot = Array.isArray(rightHandAssignment) ? rightHandAssignment[0] : undefined;

      // @TODO the marker shouldn't be leaking through here
      if (isMarkerNode(expressionRoot)) {
        expressionRoot = undefined;
      }

      // guaranteed by the getPosition function, but we check it here for type safety
      if (Array.isArray(expressionRoot)) {
        return [];
      }

      const suggestions: ISuggestionItem[] = [];

      if (!expressionRoot) {
        suggestions.push(getDateHistogramCompletionItem(histogramBarTarget));
      }

      const expressionSuggestions = await suggestForExpression({
        innerText,
        getColumnsByType: callbacks?.getByType,
        expressionRoot,
        location: Location.STATS_BY,
        context,
        hasMinimumLicenseRequired: callbacks?.hasMinimumLicenseRequired,
      });

      suggestions.push(...expressionSuggestions);

      if (
        isExpressionComplete(
          getExpressionType(expressionRoot, context?.fields, context?.userDefinedColumns),
          innerText
        )
      ) {
        suggestions.push(
          ...getSuggestionsAfterCompleteExpression(innerText, expressionRoot, columnExists)
        );
      }

      return suggestions;
    }

    case 'grouping_expression_without_assignment': {
      const histogramBarTarget = context?.histogramBarTarget;

      // TODO - incorporate columns to ignore
      const ignored = alreadyUsedColumns(command);

      let expressionRoot: ESQLAstItem | undefined;
      if (!/,\s*$/.test(innerText)) {
        const byNode = command.args[command.args.length - 1] as ESQLCommandOption;

        expressionRoot = byNode.args[byNode.args.length - 1];
      }
      // guaranteed by the getPosition function, but we check it here for type safety
      if (Array.isArray(expressionRoot)) {
        return [];
      }

      const suggestions: ISuggestionItem[] = [];

      if (!expressionRoot) {
        suggestions.push(
          getDateHistogramCompletionItem(histogramBarTarget),
          getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || '')
        );
      }

      const expressionSuggestions = await suggestForExpression({
        innerText,
        getColumnsByType: callbacks?.getByType,
        expressionRoot,
        location: Location.STATS_BY,
        context,
        hasMinimumLicenseRequired: callbacks?.hasMinimumLicenseRequired,
      });

      suggestions.push(...expressionSuggestions);

      if (
        isExpressionComplete(
          getExpressionType(expressionRoot, context?.fields, context?.userDefinedColumns),
          innerText
        )
      ) {
        suggestions.push(
          ...getSuggestionsAfterCompleteExpression(innerText, expressionRoot, columnExists)
        );
      }

      return suggestions;
    }

    default:
      return [];
  }
}
