/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQLVariableType } from '@kbn/esql-types';
import type { FunctionParameterContext } from '../../../definitions/utils/autocomplete/expressions/types';
import { isAssignment, isColumn, isFunctionExpression } from '../../../ast/is';
import type { ICommandCallbacks } from '../../types';
import { Location } from '../../types';
import type {
  ESQLCommandOption,
  ESQLColumn,
  ESQLFunction,
  ESQLAstItem,
  ESQLSingleAstItem,
  ESQLAstAllCommands,
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
import { columnExists as _columnExists } from '../../../definitions/utils/autocomplete/helpers';
import { suggestForExpression } from '../../../definitions/utils';
import {
  getFunctionsToIgnoreForStats,
  isAggFunctionUsedAlready,
  isTimeseriesAggUsedAlready,
} from '../../../definitions/utils/autocomplete/functions';
import { getAllFunctions } from '../../../definitions/utils/functions';
import { FunctionDefinitionTypes } from '../../../definitions/types';
import { isExpressionComplete, getExpressionType } from '../../../definitions/utils/expressions';
import { getPosition, getCommaAndPipe, rightAfterColumn } from './utils';
import { isMarkerNode, findAstPosition } from '../../../definitions/utils/ast';
import { within } from '../../../ast/location';
import { inOperators, nullCheckOperators } from '../../../definitions/all_operators';
import { buildExpressionFunctionParameterContext } from '../../../definitions/utils';

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
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

  // Find the function at cursor position for suggestions
  const foundFunction = cursorPosition ? findFunctionForSuggestions(command, cursorPosition) : null;

  let functionParameterContext: FunctionParameterContext | undefined;

  if (
    foundFunction &&
    (foundFunction.subtype === 'variadic-call' || foundFunction.subtype === 'binary-expression')
  ) {
    functionParameterContext = buildCustomFilteringContext(command, foundFunction, context);
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
        lastArg: foundFunction || expressionRoot,
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
        suggestFunctions: true,
        controlType: ESQLVariableType.FUNCTIONS,
        functionParameterContext,
      });

      return expressionSuggestions;
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

      const lastArgRhs = Array.isArray(rightHandAssignment)
        ? rightHandAssignment[0]
        : rightHandAssignment;

      const expressionSuggestions = await getExpressionSuggestions({
        query,
        command,
        cursorPosition,
        expressionRoot,
        lastArg: foundFunction || lastArgRhs,
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
        suggestFunctions: true,
        controlType: ESQLVariableType.FUNCTIONS,
        functionParameterContext,
      });

      return expressionSuggestions;
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
      const lastArgRhs = Array.isArray(rightHandAssignment)
        ? rightHandAssignment[0]
        : rightHandAssignment;

      return getExpressionSuggestions({
        query,
        command,
        cursorPosition,
        expressionRoot,
        lastArg: foundFunction || lastArgRhs,
        location: Location.STATS_BY,
        context,
        callbacks,
        emptySuggestions: [getDateHistogramCompletionItem(context?.histogramBarTarget ?? 0)],
        afterCompleteSuggestions: getCommaAndPipe(innerText, expressionRoot, columnExists),
        addSpaceAfterFirstField: false,
        ignoredColumns,
        openSuggestions: true,
        functionParameterContext,
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
        lastArg: foundFunction || expressionRoot,
        location: Location.STATS_BY,
        context,
        callbacks,
        emptySuggestions: [
          getNewUserDefinedColumnSuggestion(callbacks?.getSuggestedUserDefinedColumnName?.() || ''),
          getDateHistogramCompletionItem(context?.histogramBarTarget ?? 0),
        ],
        afterCompleteSuggestions: getCommaAndPipe(innerText, expressionRoot, columnExists),
        addSpaceAfterFirstField: false,
        ignoredColumns,
        openSuggestions: true,
        functionParameterContext,
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
  lastArg,
  context,
  callbacks,
  emptySuggestions = [],
  afterCompleteSuggestions = [],
  addSpaceAfterFirstField,
  suggestColumns = true,
  suggestFunctions = true,
  controlType,
  ignoredColumns = [],
  openSuggestions,
  functionParameterContext,
}: {
  query: string;
  command: ESQLAstAllCommands;
  cursorPosition: number;
  expressionRoot: ESQLSingleAstItem | undefined;
  lastArg?: ESQLAstItem;
  location: Location;
  context?: ICommandContext;
  callbacks?: ICommandCallbacks;
  emptySuggestions?: ISuggestionItem[];
  afterCompleteSuggestions?: ISuggestionItem[];
  addSpaceAfterFirstField?: boolean;
  suggestColumns?: boolean;
  suggestFunctions?: boolean;
  controlType?: ESQLVariableType;
  ignoredColumns?: string[];
  openSuggestions?: boolean;
  functionParameterContext?: FunctionParameterContext;
}): Promise<ISuggestionItem[]> {
  const suggestions: ISuggestionItem[] = [];
  const innerText = query.substring(0, cursorPosition);

  const insideFunction =
    lastArg && isFunctionExpression(lastArg) && within(cursorPosition, lastArg);

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
          addSpaceAfterFirstField,
          ignoredColumnsForEmptyExpression: ignoredColumns,
          suggestFields: suggestColumns,
          suggestFunctions,
          controlType,
          openSuggestions,
          functionParameterContext,
        },
      }))
    );
  }

  if (
    (!expressionRoot ||
      (isColumn(expressionRoot) && !_columnExists(expressionRoot.parts.join('.'), context))) &&
    !/not\s+$/i.test(innerText) &&
    !insideFunction
  ) {
    suggestions.push(...emptySuggestions);
  }

  if (
    isExpressionComplete(getExpressionType(expressionRoot, context?.columns), innerText) &&
    !insideFunction
  ) {
    suggestions.push(...afterCompleteSuggestions);
  }

  return suggestions;
}

function getByOption(command: ESQLAstAllCommands): ESQLCommandOption | undefined {
  return command.args.find((arg) => !Array.isArray(arg) && arg.name === 'by') as
    | ESQLCommandOption
    | undefined;
}

function isNodeWithinByClause(node: ESQLSingleAstItem, command: ESQLAstAllCommands): boolean {
  const byOption = getByOption(command);

  return byOption ? within(node, byOption) : false;
}

function alreadyUsedColumns(command: ESQLAstAllCommands) {
  const byOption = getByOption(command);
  const columnNodes = (byOption?.args.filter(
    (arg) => !Array.isArray(arg) && arg.type === 'column'
  ) ?? []) as ESQLColumn[];

  return columnNodes.map((node) => node.parts.join('.'));
}

// Builds function filtering context: always ignore grouping functions,
// in main STATS clause also filter conflicting aggregate functions
function buildCustomFilteringContext(
  command: ESQLAstAllCommands,
  foundFunction: ESQLFunction | null,
  context?: ICommandContext
): FunctionParameterContext | undefined {
  if (!foundFunction) {
    return undefined;
  }

  const basicContext = buildExpressionFunctionParameterContext(foundFunction, context);

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

function findFunctionForSuggestions(
  command: ESQLAstAllCommands,
  cursorPosition: number
): ESQLFunction | null {
  const { node, containingFunction } = findAstPosition([command], cursorPosition);

  if (node && node.type === 'function') {
    const fn = node as ESQLFunction;

    const isSpecialOperator =
      inOperators.some((op) => op.name === fn.name) ||
      nullCheckOperators.some((op) => op.name === fn.name);

    if (
      fn.subtype === 'variadic-call' ||
      (fn.subtype === 'binary-expression' && isSpecialOperator)
    ) {
      return fn;
    }
  }

  return containingFunction || null;
}
