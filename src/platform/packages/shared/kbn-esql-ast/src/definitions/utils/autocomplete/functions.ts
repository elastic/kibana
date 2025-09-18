/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { LicenseType } from '@kbn/licensing-types';

import type { PricingProduct } from '@kbn/core-pricing-common/src/types';
import { uniq } from 'lodash';
import {
  isAssignment,
  isColumn,
  isFunctionExpression,
  isList,
  isLiteral,
  isOptionNode,
} from '../../../ast/is';
import {
  allStarConstant,
  commaCompleteItem,
  listCompleteItem,
} from '../../../commands_registry/complete_items';
import { getLocationInfo } from '../../../commands_registry/location';
import type {
  ESQLColumnData,
  GetColumnsByTypeFn,
  ICommandCallbacks,
  ICommandContext,
  ISuggestionItem,
  ItemKind,
} from '../../../commands_registry/types';
import { parse } from '../../../parser';
import type { ESQLAstItem, ESQLCommand, ESQLCommandOption, ESQLFunction } from '../../../types';
import { Walker } from '../../../walker';
import { comparisonFunctions } from '../../all_operators';
import { timeUnitsToSuggest } from '../../constants';
import type { FunctionParameter, FunctionParameterType } from '../../types';
import { FunctionDefinitionTypes, isNumericType } from '../../types';
import { correctQuerySyntax, findAstPosition } from '../ast';
import { getColumnExists } from '../columns';
import { getExpressionType } from '../expressions';
import {
  filterFunctionSignatures,
  getAllFunctions,
  getFunctionDefinition,
  getFunctionSuggestions,
} from '../functions';
import { buildConstantsDefinitions, getCompatibleLiterals, getDateLiterals } from '../literals';
import { getSuggestionsToRightOfOperatorExpression } from '../operators';
import { buildValueDefinitions } from '../values';
import {
  getFieldsOrFunctionsSuggestions,
  getValidSignaturesAndTypesToSuggestNext,
  pushItUpInTheList,
} from './helpers';

function checkContentPerDefinition(fn: ESQLFunction, def: FunctionDefinitionTypes): boolean {
  const fnDef = getFunctionDefinition(fn.name);
  return (
    (!!fnDef && fnDef.type === def) ||
    extractFunctionArgs(fn.args).some((arg) => checkContentPerDefinition(arg, def))
  );
}

export function isAggFunctionUsedAlready(command: ESQLCommand, argIndex: number) {
  if (argIndex < 0) {
    return false;
  }
  const arg = command.args[argIndex];
  return isFunctionExpression(arg)
    ? checkContentPerDefinition(arg, FunctionDefinitionTypes.AGG)
    : false;
}

export function isTimeseriesAggUsedAlready(command: ESQLCommand, argIndex: number) {
  if (argIndex < 0) {
    return false;
  }
  const arg = command.args[argIndex];
  return isFunctionExpression(arg)
    ? checkContentPerDefinition(arg, FunctionDefinitionTypes.TIME_SERIES_AGG)
    : false;
}

function extractFunctionArgs(args: ESQLAstItem[]): ESQLFunction[] {
  return args
    .flatMap((arg) => (isAssignment(arg) ? arg.args[1] : arg))
    .filter(isFunctionExpression);
}

function getFnContent(fn: ESQLFunction): string[] {
  return [fn.name].concat(extractFunctionArgs(fn.args).flatMap(getFnContent));
}

function getFunctionsToIgnoreForStats(command: ESQLCommand, argIndex: number) {
  if (argIndex < 0) {
    return [];
  }
  const arg = command.args[argIndex];
  return isFunctionExpression(arg) ? getFnContent(arg) : [];
}

const addCommaIf = (condition: boolean, text: string) => (condition ? `${text},` : text);

const getCommandAndOptionWithinFORK = (
  command: ESQLCommand<'fork'>
): {
  command: ESQLCommand;
  option: ESQLCommandOption | undefined;
} => {
  let option;
  let subCommand;
  Walker.walk(command, {
    visitCommandOption: (_node) => {
      option = _node;
    },
    visitCommand: (_node) => {
      subCommand = _node;
    },
  });

  return {
    option,
    command: subCommand ?? command,
  };
};

export async function getFunctionArgsSuggestions(
  innerText: string,
  commands: ESQLCommand[],
  getFieldsByType: GetColumnsByTypeFn,
  fullText: string,
  offset: number,
  context?: ICommandContext,
  hasMinimumLicenseRequired?: (minimumLicenseRequired: LicenseType) => boolean
): Promise<ISuggestionItem[]> {
  const analysis = analyzeParameterLocation(
    fullText,
    offset,
    commands,
    context,
    hasMinimumLicenseRequired
  );

  if (!analysis) {
    return [];
  }

  const {
    compatibleParamDefs,
    shouldAddComma,
    shouldAdvanceCursor,
    hasMoreMandatoryArgs,
    currentArg,
    fnToIgnore,
  } = analysis;

  // 4. Parameter Types to Suggest
  // Suggested constant values and compatible literals
  const suggestedConstants = uniq(
    compatibleParamDefs
      .map((d) => d.suggestedValues)
      .filter((d) => d)
      .flat()
  ) as string[];

  if (suggestedConstants.length) {
    return buildValueDefinitions(suggestedConstants, {
      addComma: shouldAddComma,
      advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs,
    });
  }

  // Helper to ensure both keyword and text types are present
  const ensureKeywordAndText = (types: FunctionParameterType[]) => {
    if (types.includes('keyword') && !types.includes('text')) {
      types.push('text');
    }
    if (types.includes('text') && !types.includes('keyword')) {
      types.push('keyword');
    }
    return types;
  };

  // Helper to get unique types from param defs
  const getTypesFromParamDefs = (paramDefs: FunctionParameter[]) => {
    return ensureKeywordAndText(Array.from(new Set(paramDefs.map(({ type }) => type))));
  };

  // Separate the param definitions into two groups:
  // fields should only be suggested if the param isn't constant-only,
  // and constant suggestions should only be given if it is.
  //
  // TODO — improve this to inherit the constant flag from the outer function
  // (e.g. if func1's first parameter is constant-only, any nested functions should
  // inherit that constraint: func1(func2(shouldBeConstantOnly)))
  //
  const constantOnlyParamDefs = compatibleParamDefs.filter(
    (p) => p.constantOnly || ['time_duration', 'date_period'].includes(p.type)
  );

  // --- Suggestion Generation Section ---

  const suggestions: ISuggestionItem[] = [];
  const noArgDefined = !currentArg;

  if (noArgDefined || getExpressionType(currentArg) === 'unknown') {
    suggestions.push(
      ...getCompatibleLiterals(
        getTypesFromParamDefs(constantOnlyParamDefs),
        {
          addComma: shouldAddComma,
          advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs,
          supportsControls: context?.supportsControls,
        },
        context?.variables
      )
    );

    if (getTypesFromParamDefs(compatibleParamDefs).includes('date'))
      suggestions.push(
        ...getDateLiterals({
          addComma: shouldAddComma,
          advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs,
        })
      );

    suggestions.push(
      ...pushItUpInTheList(
        await getFieldsByType(
          getTypesFromParamDefs(
            compatibleParamDefs.filter((d) => !d.constantOnly)
          ) as FunctionParameterType[],
          [],
          {
            addComma: shouldAddComma,
            advanceCursor: shouldAdvanceCursor,
            openSuggestions: shouldAdvanceCursor,
          }
        ),
        true
      )
    );

    if (compatibleParamDefs.every((d) => !d.fieldsOnly)) {
      const location = getLocationInfo(
        offset,
        command,
        commands,
        isAggFunctionUsedAlready(command, finalCommandArgIndex)
      ).id;
      suggestions.push(
        ...getFunctionSuggestions(
          {
            location,
            returnTypes: getTypesFromParamDefs(compatibleParamDefs),
            ignored: fnToIgnore,
          },
          hasMinimumLicenseRequired,
          context?.activeProduct
        ).map((suggestion) => ({
          ...suggestion,
          text: addCommaIf(shouldAddComma, suggestion.text),
        }))
      );
    }
  }

  if (currentArg) {
    if (
      isLiteral(currentArg) &&
      isNumericType(currentArg.literalType) &&
      (getTypesFromParamDefs(compatibleParamDefs).includes('time_duration') ||
        getTypesFromParamDefs(compatibleParamDefs).includes('date_period'))
    ) {
      suggestions.push(
        ...buildConstantsDefinitions(
          timeUnitsToSuggest.map(({ name }) => name),
          undefined,
          undefined,
          { addComma: shouldAddComma, advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs }
        )
      );
    }

    if (hasMoreMandatoryArgs) {
      // Suggest a comma if there's another argument for the function
      suggestions.push(commaCompleteItem);
    }
  }

  // For special case of COUNT, suggest * if cursor is in empty spot
  // e.g. count( / ) -> suggest `*`
  if (fnDefinition.name === 'count' && !currentArg) {
    suggestions.push(allStarConstant);
  }
  return suggestions;
}

const analyzeParameterLocation = (
  fullText: string,
  offset: number,
  commands: ESQLCommand[],
  context?: ICommandContext,
  hasMinimumLicenseRequired?: (minimumLicenseRequired: LicenseType) => boolean
) => {
  // --- Context Gathering Section ---
  // 1. AST Node Context
  // Find the AST node and command at the cursor position
  const astContext = findAstPosition(commands, offset);
  const node = astContext.node;
  if (!node) {
    return;
  }
  let command = astContext.command;
  // Special handling if the command is a `fork`
  if (astContext.command?.name === 'fork') {
    const { command: forkCommand } =
      astContext.command?.name === 'fork'
        ? getCommandAndOptionWithinFORK(astContext.command as ESQLCommand<'fork'>)
        : { command: undefined };
    command = forkCommand || astContext.command;
  }

  // 2. Function Definition
  // The function’s metadata and signatures (fnDefinition)
  const functionNode = node as ESQLFunction;
  const fnDefinition = getFunctionDefinition(functionNode.name);
  // early exit on no hit
  if (!fnDefinition) {
    return;
  }
  // Filtered signatures based on license requirements
  const filteredFnDefinition = {
    ...fnDefinition,
    signatures: filterFunctionSignatures(fnDefinition.signatures, hasMinimumLicenseRequired),
  };

  // 3. Argument State
  // Available columns and their types (columnMap)
  const columnMap: Map<string, ESQLColumnData> = context?.columns || new Map();
  const references = {
    columns: columnMap,
  };
  // Extract argument index, types to suggest, etc.
  const {
    typesToSuggestNext: compatibleParamDefs,
    hasMoreMandatoryArgs,
    enrichedArgs,
    argIndex,
  } = getValidSignaturesAndTypesToSuggestNext(functionNode, references, filteredFnDefinition);

  // The specific argument at the cursor
  const currentArg = enrichedArgs[argIndex];

  // 6. Special Function Handling
  // Whether to add a comma after the suggestion
  const isCursorFollowedByComma = fullText
    ? fullText.slice(offset, fullText.length).trimStart().startsWith(',')
    : false;
  // Whether the function is a boolean condition (e.g., `case`)
  const canBeBooleanCondition =
    // For `CASE()`, there can be multiple conditions, so keep suggesting fields and functions if possible
    fnDefinition.name === 'case' ||
    // If the type is explicitly a boolean condition
    compatibleParamDefs.some((t) => t && t.type === 'boolean' && t.name === 'condition');
  // Whether to add a comma after the suggestion
  const shouldAddComma = hasMoreMandatoryArgs && !isCursorFollowedByComma && !canBeBooleanCondition;
  // Whether to advance the cursor or open suggestions
  const shouldAdvanceCursor = hasMoreMandatoryArgs && !isCursorFollowedByComma;

  // 7. Ignored Functions
  // Functions to ignore based on context (e.g., grouping, aggregation, already-used functions)
  const commandArgIndex = command.args.findIndex(
    (cmdArg) => !Array.isArray(cmdArg) && cmdArg.location.max >= node.location.max
  );
  const finalCommandArgIndex =
    command.name !== 'stats' && command.name !== 'inlinestats'
      ? -1
      : commandArgIndex < 0
      ? Math.max(command.args.length - 1, 0)
      : commandArgIndex;
  const finalCommandArg = command.args[finalCommandArgIndex];
  const fnToIgnore = [];
  fnToIgnore.push(
    ...getAllFunctions({ type: FunctionDefinitionTypes.GROUPING }).map(({ name }) => name)
  );
  if (
    (command.name !== 'stats' && command.name !== 'inlinestats') ||
    (isOptionNode(finalCommandArg) && finalCommandArg.name === 'by')
  ) {
    // ignore the current function
    fnToIgnore.push(node.name);
  } else {
    fnToIgnore.push(
      ...getFunctionsToIgnoreForStats(command, finalCommandArgIndex),
      // TODO — can this be captured in just the location ID computation?
      ...(isAggFunctionUsedAlready(command, finalCommandArgIndex)
        ? getAllFunctions({ type: FunctionDefinitionTypes.AGG }).map(({ name }) => name)
        : []),
      ...(isTimeseriesAggUsedAlready(command, finalCommandArgIndex)
        ? getAllFunctions({ type: FunctionDefinitionTypes.TIME_SERIES_AGG }).map(({ name }) => name)
        : [])
    );
  }

  return {
    compatibleParamDefs,
    shouldAddComma,
    shouldAdvanceCursor,
    hasMoreMandatoryArgs,
    currentArg,
    fnToIgnore,
  };
};

function isOperator(node: ESQLFunction) {
  return getFunctionDefinition(node.name)?.type === FunctionDefinitionTypes.OPERATOR;
}

async function getListArgsSuggestions(
  innerText: string,
  commands: ESQLCommand[],
  getFieldsByType: GetColumnsByTypeFn,
  columnMap: Map<string, ESQLColumnData>,
  offset: number,
  hasMinimumLicenseRequired?: (minimumLicenseRequired: LicenseType) => boolean,
  activeProduct?: PricingProduct
) {
  const suggestions = [];
  const { command, node } = findAstPosition(commands, offset);

  // node is supposed to be the function who support a list argument (like the "in" operator)
  // so extract the type of the first argument and suggest fields of that type
  if (node && isFunctionExpression(node)) {
    const list = node?.args[1];

    if (isList(list)) {
      const noParens = list.location.min === 0 && list.location.max === 0;

      if (noParens) {
        suggestions.push(listCompleteItem);

        return suggestions;
      }
    }

    const [firstArg] = node.args;
    if (isColumn(firstArg)) {
      const argType = getExpressionType(firstArg, columnMap);
      if (argType) {
        // do not propose existing columns again
        const otherArgs = isList(list)
          ? list.values
          : node.args.filter(Array.isArray).flat().filter(isColumn);
        suggestions.push(
          ...(await getFieldsOrFunctionsSuggestions(
            [argType],
            getLocationInfo(offset, command, commands, false).id,
            getFieldsByType,
            {
              functions: true,
              columns: true,
            },
            { ignoreColumns: [firstArg.name, ...otherArgs.map(({ name }) => name)] },
            hasMinimumLicenseRequired,
            activeProduct
          ))
        );
      }
    }
  }
  return suggestions;
}

function isNotEnrichClauseAssigment(node: ESQLFunction, command: ESQLCommand) {
  return node.name !== '=' && command.name !== 'enrich';
}

// TODO: merge this into suggestForExpression
export const getInsideFunctionsSuggestions = async (
  query: string,
  cursorPosition?: number,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext
) => {
  const innerText = query.substring(0, cursorPosition);
  const correctedQuery = correctQuerySyntax(innerText);
  const { ast } = parse(correctedQuery, { withFormatting: true });
  const { node, command, containingFunction } = findAstPosition(ast, cursorPosition ?? 0);
  if (!node) {
    return undefined;
  }

  if (node.type === 'literal' && node.literalType === 'keyword') {
    // command ... "<here>"
    return [];
  }
  if (node.type === 'function') {
    // For now, we don't suggest for expressions within any function besides CASE
    // e.g. CASE(field != /)
    //
    // So, it is handled as a special branch...
    if (
      containingFunction?.name === 'case' &&
      !Array.isArray(node) &&
      node?.subtype === 'binary-expression'
    ) {
      return await getSuggestionsToRightOfOperatorExpression({
        queryText: innerText,
        location: getLocationInfo(cursorPosition ?? 0, command, ast, false).id,
        rootOperator: node,
        getExpressionType: (expression) => getExpressionType(expression, context?.columns),
        getColumnsByType: callbacks?.getByType ?? (() => Promise.resolve([])),
        hasMinimumLicenseRequired: callbacks?.hasMinimumLicenseRequired,
        activeProduct: context?.activeProduct,
      });
    }
    if (['in', 'not in'].includes(node.name)) {
      // // command ... a in ( <here> )
      // return { type: 'list' as const, command, node, option, containingFunction };
      return await getListArgsSuggestions(
        innerText,
        ast,
        callbacks?.getByType ?? (() => Promise.resolve([])),
        context?.columns ?? new Map(),
        cursorPosition ?? 0,
        callbacks?.hasMinimumLicenseRequired,
        context?.activeProduct
      );
    }
    if (isNotEnrichClauseAssigment(node, command) && !isOperator(node)) {
      // command ... fn( <here> )
      return await getFunctionArgsSuggestions(
        innerText,
        ast,
        callbacks?.getByType ?? (() => Promise.resolve([])),
        query,
        cursorPosition ?? 0,
        context,
        callbacks?.hasMinimumLicenseRequired
      );
    }
  }

  return undefined;
};
