/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQLVariableType } from '@kbn/esql-types';
import { Walker } from '../../../walker';
import { getInsideFunctionsSuggestions } from '../../../definitions/utils/autocomplete/functions';
import { isAssignment, isColumn } from '../../../ast/is';
import type { ICommandCallbacks } from '../../types';
import { Location } from '../../types';
import type {
  ESQLCommand,
  ESQLCommandOption,
  ESQLColumn,
  ESQLFunction,
  ESQLAstItem,
  ESQLSingleAstItem,
} from '../../../types';
import { type ISuggestionItem, type ICommandContext } from '../../types';
import {
  pipeCompleteItem,
  byCompleteItem,
  whereCompleteItem,
  commaCompleteItem,
  getNewUserDefinedColumnSuggestion,
  getDateHistogramCompletionItem,
} from '../../complete_items';
import {
  columnExists as _columnExists,
  getControlSuggestionIfSupported,
  suggestForExpression,
  within,
} from '../../../definitions/utils/autocomplete/helpers';
import { isExpressionComplete, getExpressionType } from '../../../definitions/utils/expressions';
import { ESQL_VARIABLES_PREFIX } from '../../constants';
import { getPosition, getCommaAndPipe, rightAfterColumn } from './utils';
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
  const isInlineStats = command.name === 'inlinestats';

  const columnExists = (name: string) => _columnExists(name, context);

  const innerText = query.substring(0, cursorPosition);
  const pos = getPosition(command, innerText);

  const lastCharacterTyped = innerText[innerText.length - 1];
  const controlSuggestions = getControlSuggestionIfSupported(
    Boolean(context?.supportsControls),
    ESQLVariableType.FUNCTIONS,
    context?.variables,
    lastCharacterTyped !== ESQL_VARIABLES_PREFIX
  );

  const functionsSpecificSuggestions = await getInsideFunctionsSuggestions(
    query,
    cursorPosition,
    callbacks,
    context
  );
  if (
    functionsSpecificSuggestions &&
    cursorPosition &&
    Walker.findFunction(command, (fn) => within(cursorPosition, fn.location))
  ) {
    return functionsSpecificSuggestions;
  }

  switch (pos) {
    case 'expression_without_assignment': {
      const isNewMultipleExpression = /,\s*$/.test(innerText);

      const expressionRoot = isNewMultipleExpression
        ? undefined // we're in a new expression, but there isn't an AST node for it yet
        : command.args[command.args.length - 1];

      if (Array.isArray(expressionRoot)) {
        return [];
      }

      const expressionSuggestions = await getExpressionSuggestions({
        innerText,
        expressionRoot,
        location: Location.STATS,
        context,
        callbacks,
        emptySuggestions: [
          ...(!isNewMultipleExpression && !isInlineStats
            ? [
                {
                  ...byCompleteItem,
                  sortText: 'D',
                },
              ]
            : []),
          getNewUserDefinedColumnSuggestion(
            (await callbacks?.getSuggestedUserDefinedColumnName?.()) || ''
          ),
        ],
        afterCompleteSuggestions: [
          whereCompleteItem,
          byCompleteItem,
          ...getCommaAndPipe(innerText, expressionRoot, columnExists),
        ],
        suggestColumns: false,
      });

      return [...expressionSuggestions, ...controlSuggestions];
    }

    case 'expression_after_assignment': {
      // Find expression root
      const assignment = command.args[command.args.length - 1];
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

      const expressionSuggestions = await getExpressionSuggestions({
        innerText,
        expressionRoot,
        location: Location.STATS,
        context,
        callbacks,
        emptySuggestions: [],
        afterCompleteSuggestions: [
          whereCompleteItem,
          byCompleteItem,
          ...getCommaAndPipe(innerText, expressionRoot, columnExists),
        ],
        suggestColumns: false,
      });

      return [...expressionSuggestions, ...controlSuggestions];
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
        activeProduct: context?.activeProduct,
      });

      // Is this a complete boolean expression?
      // If so, we can call it done and suggest a pipe
      const expressionType = getExpressionType(expressionRoot, context?.columns);
      if (expressionType === 'boolean' && isExpressionComplete(expressionType, innerText)) {
        suggestions.push(pipeCompleteItem, { ...commaCompleteItem, text: ', ' }, byCompleteItem);
      }

      return suggestions;
    }

    case 'grouping_expression_after_assignment': {
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

      const ignoredColumns = alreadyUsedColumns(command);

      return getExpressionSuggestions({
        innerText,
        expressionRoot,
        location: Location.STATS_BY,
        context,
        callbacks,
        emptySuggestions: [getDateHistogramCompletionItem(context?.histogramBarTarget ?? 0)],
        afterCompleteSuggestions: getCommaAndPipe(innerText, expressionRoot, columnExists),
        advanceCursorAfterInitialColumn: false,
        ignoredColumns,
      });
    }

    case 'grouping_expression_without_assignment': {
      let expressionRoot: ESQLAstItem | undefined;
      if (!/,\s*$/.test(innerText)) {
        const byNode = command.args[command.args.length - 1] as ESQLCommandOption;

        expressionRoot = byNode.args[byNode.args.length - 1];
      }
      // guaranteed by the getPosition function, but we check it here for type safety
      if (Array.isArray(expressionRoot)) {
        return [];
      }

      const ignoredColumns = alreadyUsedColumns(command);

      return getExpressionSuggestions({
        innerText,
        expressionRoot,
        location: Location.STATS_BY,
        context,
        callbacks,
        emptySuggestions: [
          getNewUserDefinedColumnSuggestion(
            (await callbacks?.getSuggestedUserDefinedColumnName?.()) || ''
          ),
          getDateHistogramCompletionItem(context?.histogramBarTarget ?? 0),
        ],
        afterCompleteSuggestions: getCommaAndPipe(innerText, expressionRoot, columnExists),
        advanceCursorAfterInitialColumn: false,
        ignoredColumns,
      });
    }

    default:
      return [];
  }
}

async function getExpressionSuggestions({
  innerText,
  expressionRoot,
  location,
  context,
  callbacks,
  emptySuggestions = [],
  afterCompleteSuggestions = [],
  advanceCursorAfterInitialColumn,
  suggestColumns = true,
  ignoredColumns = [],
}: {
  innerText: string;
  expressionRoot: ESQLSingleAstItem | undefined;
  location: Location;
  context?: ICommandContext;
  callbacks?: ICommandCallbacks;
  emptySuggestions?: ISuggestionItem[];
  afterCompleteSuggestions?: ISuggestionItem[];
  advanceCursorAfterInitialColumn?: boolean;
  suggestColumns?: boolean;
  ignoredColumns?: string[];
}): Promise<ISuggestionItem[]> {
  const suggestions: ISuggestionItem[] = [];

  if (!rightAfterColumn(innerText, expressionRoot, (name) => _columnExists(name, context))) {
    suggestions.push(
      ...(await suggestForExpression({
        innerText,
        expressionRoot,
        location,
        hasMinimumLicenseRequired: callbacks?.hasMinimumLicenseRequired,
        activeProduct: context?.activeProduct,
        context,
        getColumnsByType: suggestColumns ? callbacks?.getByType : undefined,
        advanceCursorAfterInitialColumn,
        ignoredColumnsForEmptyExpression: ignoredColumns,
      }))
    );
  }

  if (
    (!expressionRoot ||
      (isColumn(expressionRoot) && !_columnExists(expressionRoot.parts.join('.'), context))) &&
    !/not\s+$/i.test(innerText)
  ) {
    suggestions.push(...emptySuggestions);
  }

  if (isExpressionComplete(getExpressionType(expressionRoot, context?.columns), innerText)) {
    suggestions.push(...afterCompleteSuggestions);
  }

  return suggestions;
}
