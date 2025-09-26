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
  buildFunctionParameterContext,
  type FunctionParameterContext,
} from '../../../definitions/utils/autocomplete/helpers';
import {
  getFunctionsToIgnoreForStats,
  isAggFunctionUsedAlready,
  isTimeseriesAggUsedAlready,
} from '../../../definitions/utils/autocomplete/functions';
import { getAllFunctions } from '../../../definitions/utils/functions';
import { FunctionDefinitionTypes } from '../../../definitions/types';
import { isExpressionComplete, getExpressionType } from '../../../definitions/utils/expressions';
import { ESQL_VARIABLES_PREFIX } from '../../constants';
import { getPosition, getCommaAndPipe, rightAfterColumn } from './utils';
import { isMarkerNode } from '../../../definitions/utils/ast';
import { within } from '../../../ast/location';

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition: number = query.length
): Promise<ISuggestionItem[]> {
  if (!callbacks?.getByType) {
    return [];
  }
  const isInlineStats = command.name === 'inline stats';

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

  // Find the innermost function containing the cursor
  // Filter for 'variadic-call' subtype to exclude operators like '='
  let foundFunction: ESQLFunction | null = null;
  if (cursorPosition) {
    const allFunctions: ESQLFunction[] = [];
    Walker.walk(command, {
      visitFunction: (fn) => {
        if (within(cursorPosition, fn)) {
          allFunctions.push(fn);
        }
      },
    });
    // Find the innermost variadic-call function (not binary expressions like '=')
    foundFunction =
      allFunctions
        .filter((fn) => fn.subtype === 'variadic-call')
        .sort((a, b) => {
          // Sort by location to get the innermost function
          const aSize = a.location.max - a.location.min;
          const bSize = b.location.max - b.location.min;
          return aSize - bSize; // Smaller range = more inner function
        })[0] || null;
  }

  if (foundFunction && foundFunction.subtype === 'variadic-call') {
    // Build STATS-specific filtering context
    const functionParameterContext = buildCustomFilteringContext(command, foundFunction, context);
    const isInBy = isNodeWithinByClause(foundFunction, command);
    const isTimeseriesSource = query.trimStart().toLowerCase().startsWith('ts ');

    // Determine the appropriate location based on context
    let location: Location;
    if (isInBy) {
      // BY clause always uses EVAL location
      location = Location.EVAL;
    } else if (isTimeseriesSource && isAggFunctionUsedAlready(command, command.args.length - 1)) {
      // Inside aggregate function with TS source command
      location = Location.STATS_TIMESERIES;
    } else {
      // Regular STATS context
      location = Location.STATS;
    }

    const functionsSpecificSuggestions = await suggestForExpression({
      query,
      expressionRoot: foundFunction,
      command,
      cursorPosition,
      location,
      context,
      callbacks,
      options: {
        // Pass STATS-specific filtering context to be preserved in recursive calls
        functionParameterContext,
      },
    });

    if (functionsSpecificSuggestions.length > 0) {
      return functionsSpecificSuggestions;
    }
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
        query,
        command,
        cursorPosition,
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
          getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || ''),
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
        query,
        command,
        cursorPosition,
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
        query,
        expressionRoot,
        command,
        cursorPosition,
        location: Location.STATS_WHERE,
        context,
        callbacks,
        options: {
          preferredExpressionType: 'boolean',
        },
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
        query,
        command,
        cursorPosition,
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
        query,
        command,
        cursorPosition,
        expressionRoot,
        location: Location.STATS_BY,
        context,
        callbacks,
        emptySuggestions: [
          getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || ''),
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

// TODO: Verify if ignoredColumns parameter is redundant since suggestForExpression
// already calculates ignored columns internally via deriveIgnoredColumns()
async function getExpressionSuggestions({
  query,
  command,
  cursorPosition,
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
  query: string;
  command: ESQLCommand;
  cursorPosition: number;
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
  const innerText = query.substring(0, cursorPosition);

  if (!rightAfterColumn(innerText, expressionRoot, (name) => _columnExists(name, context))) {
    const modifiedCallbacks = suggestColumns ? callbacks : { ...callbacks, getByType: undefined };

    suggestions.push(
      ...(await suggestForExpression({
        query,
        expressionRoot,
        command,
        cursorPosition,
        location,
        context,
        callbacks: modifiedCallbacks,
        options: {
          advanceCursorAfterInitialColumn,
          ignoredColumnsForEmptyExpression: ignoredColumns,
        },
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

function getByOption(command: ESQLCommand): ESQLCommandOption | undefined {
  return command.args.find((arg) => !Array.isArray(arg) && arg.name === 'by') as
    | ESQLCommandOption
    | undefined;
}

function isNodeWithinByClause(node: ESQLSingleAstItem, command: ESQLCommand): boolean {
  const byOption = getByOption(command);

  return byOption ? within(node, byOption) : false;
}

function alreadyUsedColumns(command: ESQLCommand) {
  const byOption = getByOption(command);
  const columnNodes = (byOption?.args.filter(
    (arg) => !Array.isArray(arg) && arg.type === 'column'
  ) ?? []) as ESQLColumn[];

  return columnNodes.map((node) => node.parts.join('.'));
}

// Builds function filtering context: always ignore grouping functions,
// in main STATS clause also filter conflicting aggregate functions
function buildCustomFilteringContext(
  command: ESQLCommand,
  foundFunction: ESQLFunction | null,
  context?: ICommandContext
): FunctionParameterContext | undefined {
  if (!foundFunction) {
    return undefined;
  }

  const basicContext = buildFunctionParameterContext(foundFunction, context);

  if (!basicContext) {
    return undefined;
  }

  const statsSpecificFunctionsToIgnore: string[] = [];
  // Always ignore grouping functions in all contexts
  statsSpecificFunctionsToIgnore.push(
    ...getAllFunctions({ type: FunctionDefinitionTypes.GROUPING }).map(({ name }) => name)
  );

  const finalCommandArgIndex = command.args.length - 1;
  const isInBy = isNodeWithinByClause(foundFunction, command);

  if (!isInBy) {
    statsSpecificFunctionsToIgnore.push(
      ...getFunctionsToIgnoreForStats(command, finalCommandArgIndex),
      ...(isAggFunctionUsedAlready(command, finalCommandArgIndex)
        ? getAllFunctions({ type: FunctionDefinitionTypes.AGG }).map(({ name }) => name)
        : []),
      ...(isTimeseriesAggUsedAlready(command, finalCommandArgIndex)
        ? getAllFunctions({ type: FunctionDefinitionTypes.TIME_SERIES_AGG }).map(({ name }) => name)
        : [])
    );
  }

  return {
    ...basicContext,
    functionsToIgnore: [...basicContext.functionsToIgnore, ...statsSpecificFunctionsToIgnore],
  };
}
