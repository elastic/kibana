/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { LicenseType } from '@kbn/licensing-types';

import { uniq } from 'lodash';
import type { PricingProduct } from '@kbn/core-pricing-common/src/types';
import { getLocationInfo } from '../../../commands_registry/location';
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
import { FULL_TEXT_SEARCH_FUNCTIONS } from '../../constants';
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
import { getCompatibleLiterals, getDateLiterals } from '../literals';
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

export function getFunctionsToIgnoreForStats(command: ESQLCommand, argIndex: number) {
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
  const astContext = findAstPosition(commands, offset);
  const node = astContext.node;
  // If the node is not
  if (!node) {
    return [];
  }
  let command = astContext.command;
  if (astContext.command?.name === 'fork') {
    const { command: forkCommand } =
      astContext.command?.name === 'fork'
        ? getCommandAndOptionWithinFORK(astContext.command as ESQLCommand<'fork'>)
        : { command: undefined };
    command = forkCommand || astContext.command;
  }
  const functionNode = node as ESQLFunction;
  const fnDefinition = getFunctionDefinition(functionNode.name);
  // early exit on no hit
  if (!fnDefinition) {
    return [];
  }

  const filteredFnDefinition = {
    ...fnDefinition,
    signatures: filterFunctionSignatures(fnDefinition.signatures, hasMinimumLicenseRequired),
  };

  const columnMap: Map<string, ESQLColumnData> = context?.columns || new Map();

  const references = {
    columns: columnMap,
  };

  const { typesToSuggestNext, hasMoreMandatoryArgs, enrichedArgs, argIndex } =
    getValidSignaturesAndTypesToSuggestNext(
      functionNode,
      references,
      filteredFnDefinition,
      fullText,
      offset
    );
  const arg: ESQLAstItem = enrichedArgs[argIndex];

  // Whether to prepend comma to suggestion string
  // E.g. if true, "fieldName" -> "fieldName, "
  const isCursorFollowedByComma = fullText
    ? fullText.slice(offset, fullText.length).trimStart().startsWith(',')
    : false;
  const canBeBooleanCondition =
    // For `CASE()`, there can be multiple conditions, so keep suggesting fields and functions if possible
    fnDefinition.name === 'case' ||
    // If the type is explicitly a boolean condition
    typesToSuggestNext.some((t) => t && t.type === 'boolean' && t.name === 'condition');

  const shouldAddComma =
    hasMoreMandatoryArgs &&
    fnDefinition.type !== FunctionDefinitionTypes.OPERATOR &&
    !isCursorFollowedByComma &&
    !canBeBooleanCondition;
  const shouldAdvanceCursor =
    hasMoreMandatoryArgs &&
    fnDefinition.type !== FunctionDefinitionTypes.OPERATOR &&
    !isCursorFollowedByComma;

  const suggestedConstants = uniq(
    typesToSuggestNext
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

  const suggestions: ISuggestionItem[] = [];
  const noArgDefined = !arg;
  const isUnknownColumn =
    arg &&
    isColumn(arg) &&
    !getColumnExists(arg, {
      columns: columnMap,
    });
  if (noArgDefined || isUnknownColumn) {
    // ... | EVAL fn( <suggest>)
    // ... | EVAL fn( field, <suggest>)

    const commandArgIndex = command.args.findIndex(
      (cmdArg) => !Array.isArray(cmdArg) && cmdArg.location.max >= node.location.max
    );
    const finalCommandArgIndex =
      command.name !== 'stats' && command.name !== 'inline stats'
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
      (command.name !== 'stats' && command.name !== 'inline stats') ||
      (isOptionNode(finalCommandArg) && finalCommandArg.name === 'by')
    ) {
      // ignore the current function
      fnToIgnore.push(node.name);
    } else {
      fnToIgnore.push(
        ...getFunctionsToIgnoreForStats(command, finalCommandArgIndex),
        ...(isAggFunctionUsedAlready(command, finalCommandArgIndex)
          ? getAllFunctions({ type: FunctionDefinitionTypes.AGG }).map(({ name }) => name)
          : []),
        ...(isTimeseriesAggUsedAlready(command, finalCommandArgIndex)
          ? getAllFunctions({ type: FunctionDefinitionTypes.TIME_SERIES_AGG }).map(
              ({ name }) => name
            )
          : [])
      );
    }
    // Separate the param definitions into two groups:
    // fields should only be suggested if the param isn't constant-only,
    // and constant suggestions should only be given if it is.
    //
    // TODO - consider incorporating the literalOptions into this
    //
    // TODO — improve this to inherit the constant flag from the outer function
    // (e.g. if func1's first parameter is constant-only, any nested functions should
    // inherit that constraint: func1(func2(shouldBeConstantOnly)))
    //
    const constantOnlyParamDefs = typesToSuggestNext.filter(
      (p) => p.constantOnly || /_duration/.test(p.type as string)
    );

    const getTypesFromParamDefs = (paramDefs: FunctionParameter[]) => {
      return Array.from(new Set(paramDefs.map(({ type }) => type)));
    };

    const supportsControls = Boolean(context?.supportsControls);
    const variables = context?.variables;

    // Literals
    suggestions.push(
      ...getCompatibleLiterals(
        getTypesFromParamDefs(constantOnlyParamDefs) as string[],
        {
          addComma: shouldAddComma,
          advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs,
          supportsControls,
        },
        variables
      )
    );

    const ensureKeywordAndText = (types: FunctionParameterType[]) => {
      if (types.includes('keyword') && !types.includes('text')) {
        types.push('text');
      }
      if (types.includes('text') && !types.includes('keyword')) {
        types.push('keyword');
      }
      return types;
    };

    // Fields

    // In most cases, just suggest fields that match the parameter types.
    // But in the case of boolean conditions, we want to suggest fields of any type,
    // since they may be used in comparisons.

    // and we always add a comma at the end if there are more mandatory args
    // but this needs to be refined when full expressions begin to be supported

    suggestions.push(
      ...pushItUpInTheList(
        await getFieldsByType(
          // For example, in case() where we are expecting a boolean condition
          // we can accept any field types (field1 !== field2)
          canBeBooleanCondition
            ? ['any']
            : // @TODO: have a way to better suggest constant only params
              ensureKeywordAndText(
                getTypesFromParamDefs(
                  typesToSuggestNext.filter((d) => !d.constantOnly)
                ) as FunctionParameterType[]
              ),
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

    // Functions
    if (typesToSuggestNext.every((d) => !d.fieldsOnly)) {
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
            returnTypes: canBeBooleanCondition
              ? ['any']
              : (ensureKeywordAndText(
                  getTypesFromParamDefs(typesToSuggestNext)
                ) as FunctionParameterType[]),
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

    if (
      (getTypesFromParamDefs(typesToSuggestNext).includes('date') &&
        ['where', 'eval'].includes(command.name) &&
        !FULL_TEXT_SEARCH_FUNCTIONS.includes(fnDefinition.name)) ||
      (['stats', 'inline stats'].includes(command.name) &&
        typesToSuggestNext.some((t) => t && t.type === 'date' && t.constantOnly === true))
    )
      suggestions.push(
        ...getDateLiterals({
          addComma: shouldAddComma,
          advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs,
        })
      );
  }

  // for eval and row commands try also to complete numeric literals with time intervals where possible
  if (arg) {
    if (command.name !== 'stats' && command.name !== 'inline stats') {
      if (isLiteral(arg) && isNumericType(arg.literalType)) {
        // ... | EVAL fn(2 <suggest>)
        suggestions.push(
          ...getCompatibleLiterals(['time_literal_unit'], {
            addComma: shouldAddComma,
            advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs,
          })
        );
      }
    }
    // Suggest comparison functions for boolean conditions
    if (canBeBooleanCondition) {
      suggestions.push(
        ...comparisonFunctions.map<ISuggestionItem>(({ name, description }) => ({
          label: name,
          text: name,
          kind: 'Function' as ItemKind,
          detail: description,
        }))
      );
    }
    if (hasMoreMandatoryArgs) {
      // Suggest a comma if there's another argument for the function
      suggestions.push(commaCompleteItem);
    }
  }

  // For special case of COUNT, suggest * if cursor is in empty spot
  // e.g. count( / ) -> suggest `*`
  if (fnDefinition.name === 'count' && !arg) {
    suggestions.push(allStarConstant);
  }
  return suggestions;
}

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
            [argType as string],
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
