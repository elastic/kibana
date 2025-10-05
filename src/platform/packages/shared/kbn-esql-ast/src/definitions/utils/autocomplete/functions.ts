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
import {
  isAssignment,
  isColumn,
  isFunctionExpression,
  isLiteral,
  isOptionNode,
} from '../../../ast/is';
import { allStarConstant, commaCompleteItem } from '../../../commands_registry/complete_items';
import { getLocationInfo } from '../../../commands_registry/location';
import type {
  ESQLColumnData,
  GetColumnsByTypeFn,
  ICommandContext,
  ISuggestionItem,
  ItemKind,
} from '../../../commands_registry/types';
import type { ESQLAstItem, ESQLCommand, ESQLCommandOption, ESQLFunction } from '../../../types';
import { Walker } from '../../../walker';
import { comparisonFunctions } from '../../all_operators';
import { timeUnitsToSuggest } from '../../constants';
import type { FunctionParameter, FunctionParameterType } from '../../types';
import { FunctionDefinitionTypes, isNumericType } from '../../types';
import { findAstPosition } from '../ast';
import { getColumnExists } from '../columns';
import {
  filterFunctionSignatures,
  getAllFunctions,
  getFunctionDefinition,
  getFunctionSuggestions,
} from '../functions';
import { buildConstantsDefinitions, getCompatibleLiterals } from '../literals';
import { buildValueDefinitions } from '../values';
import { getValidSignaturesAndTypesToSuggestNext, pushItUpInTheList } from './helpers';

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

// TODO: Remove this function - all logic has been migrated to suggestForExpression in helpers.ts
// Only called by getInsideFunctionsSuggestions which is also obsolete (no commands use it anymore)
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

  const getTypesFromParamDefs = (paramDefs: FunctionParameter[]) => {
    return Array.from(new Set(paramDefs.map(({ type }) => type)));
  };

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

  const { compatibleParamDefs, hasMoreMandatoryArgs, enrichedArgs, argIndex } =
    getValidSignaturesAndTypesToSuggestNext(functionNode, references, filteredFnDefinition);
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
    compatibleParamDefs.some((t) => t && t.type === 'boolean' && t.name === 'condition');

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
    const constantOnlyParamDefs = compatibleParamDefs.filter(
      (p) => p.constantOnly || /_duration/.test(p.type as string)
    );

    const supportsControls = Boolean(context?.supportsControls);
    const variables = context?.variables;

    // Literals
    suggestions.push(
      ...getCompatibleLiterals(
        getTypesFromParamDefs(constantOnlyParamDefs),
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
                  compatibleParamDefs.filter((d) => !d.constantOnly)
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
            returnTypes: canBeBooleanCondition
              ? ['any']
              : (ensureKeywordAndText(
                  getTypesFromParamDefs(compatibleParamDefs)
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
  }

  // for eval and row commands try also to complete numeric literals with time intervals where possible
  if (arg) {
    if (
      isLiteral(arg) &&
      isNumericType(arg.literalType) &&
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
