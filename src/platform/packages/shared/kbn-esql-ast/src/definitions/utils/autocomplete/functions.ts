/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { uniq } from 'lodash';
import {
  allStarConstant,
  commaCompleteItem,
  listCompleteItem,
} from '../../../commands_registry/complete_items';
import {
  ESQLFieldWithMetadata,
  GetColumnsByTypeFn,
  ICommandContext,
  ISuggestionItem,
  getLocationFromCommandOrOptionName,
  Location,
  ItemKind,
  ICommandCallbacks,
} from '../../../commands_registry/types';
import {
  ESQLAstItem,
  ESQLCommand,
  ESQLCommandOption,
  ESQLFunction,
  ESQLLocation,
} from '../../../types';
import { collectUserDefinedColumns, excludeUserDefinedColumnsFromCurrentCommand } from './columns';
import { getFunctionDefinition } from '../functions';
import {
  extractTypeFromASTArg,
  getFieldsOrFunctionsSuggestions,
  getValidSignaturesAndTypesToSuggestNext,
} from './helpers';
import {
  FunctionDefinitionTypes,
  FunctionParameter,
  FunctionParameterType,
  isNumericType,
} from '../../types';
import {
  isAssignment,
  isColumn,
  isFunctionExpression,
  isList,
  isLiteral,
  isOptionNode,
} from '../../../ast/is';
import { buildValueDefinitions } from '../values';
import { getCompatibleLiterals, getDateLiterals } from '../literals';
import { getColumnExists } from '../columns';
import { getFunctionSuggestions, getAllFunctions } from '../functions';
import { pushItUpInTheList } from './helpers';
import { FULL_TEXT_SEARCH_FUNCTIONS } from '../../constants';
import { comparisonFunctions } from '../../all_operators';
import { correctQuerySyntax, findAstPosition } from '../ast';
import { parse } from '../../../parser';
import { Walker } from '../../../walker';

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
  context?: ICommandContext
): Promise<ISuggestionItem[]> {
  const astContext = findAstPosition(commands, offset);
  const node = astContext.node;
  // If the node is not
  if (!node) {
    return [];
  }
  let command = astContext.command;
  let option = astContext.option;
  if (astContext.command?.name === 'fork') {
    const { command: forkCommand, option: forkOption } =
      astContext.command?.name === 'fork'
        ? getCommandAndOptionWithinFORK(astContext.command as ESQLCommand<'fork'>)
        : { command: undefined, option: undefined };
    command = forkCommand || astContext.command;
    option = forkOption || astContext.option;
  }
  const functionNode = node as ESQLFunction;
  const fnDefinition = getFunctionDefinition(functionNode.name);
  // early exit on no hit
  if (!fnDefinition) {
    return [];
  }
  const fieldsMap: Map<string, ESQLFieldWithMetadata> = context?.fields || new Map();
  const anyUserDefinedColumns = collectUserDefinedColumns(commands, fieldsMap, innerText);

  const references = {
    fields: fieldsMap,
    userDefinedColumns: anyUserDefinedColumns,
  };
  const userDefinedColumnsExcludingCurrentCommandOnes = excludeUserDefinedColumnsFromCurrentCommand(
    commands,
    command,
    fieldsMap,
    innerText
  );

  const { typesToSuggestNext, hasMoreMandatoryArgs, enrichedArgs, argIndex } =
    getValidSignaturesAndTypesToSuggestNext(
      functionNode,
      references,
      fnDefinition,
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
      .map((d) => d.literalSuggestions || d.acceptedValues)
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
      fields: fieldsMap,
      userDefinedColumns: userDefinedColumnsExcludingCurrentCommandOnes,
    });
  if (noArgDefined || isUnknownColumn) {
    // ... | EVAL fn( <suggest>)
    // ... | EVAL fn( field, <suggest>)

    const commandArgIndex = command.args.findIndex(
      (cmdArg) => !Array.isArray(cmdArg) && cmdArg.location.max >= node.location.max
    );
    const finalCommandArgIndex =
      command.name !== 'stats'
        ? -1
        : commandArgIndex < 0
        ? Math.max(command.args.length - 1, 0)
        : commandArgIndex;

    const finalCommandArg = command.args[finalCommandArgIndex];

    const fnToIgnore = [];

    if (functionNode.subtype === 'variadic-call') {
      // for now, this getFunctionArgsSuggestions is being used in STATS to suggest for
      // operators. When that is fixed, we can remove this "is variadic-call" check
      // and always exclude the grouping functions
      fnToIgnore.push(
        ...getAllFunctions({ type: FunctionDefinitionTypes.GROUPING }).map(({ name }) => name)
      );
    }

    if (
      command.name !== 'stats' ||
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
      let location = getLocationFromCommandOrOptionName(option?.name ?? command.name);
      // If the user is working with timeseries data, we want to suggest
      // functions that are relevant to the timeseries context.
      const isTSSourceCommand = commands[0].name === 'ts';
      if (isTSSourceCommand && isAggFunctionUsedAlready(command, finalCommandArgIndex)) {
        location = Location.STATS_TIMESERIES;
      }
      suggestions.push(
        ...getFunctionSuggestions({
          location,
          returnTypes: canBeBooleanCondition
            ? ['any']
            : (ensureKeywordAndText(
                getTypesFromParamDefs(typesToSuggestNext)
              ) as FunctionParameterType[]),
          ignored: fnToIgnore,
        }).map((suggestion) => ({
          ...suggestion,
          text: addCommaIf(shouldAddComma, suggestion.text),
        }))
      );
    }

    // could also be in stats (bucket) but our autocomplete is not great yet
    if (
      (getTypesFromParamDefs(typesToSuggestNext).includes('date') &&
        ['where', 'eval'].includes(command.name) &&
        !FULL_TEXT_SEARCH_FUNCTIONS.includes(fnDefinition.name)) ||
      (command.name === 'stats' &&
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
    if (command.name !== 'stats') {
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

const within = (position: number, location: ESQLLocation | undefined) =>
  Boolean(location && location.min <= position && location.max >= position);

function isOperator(node: ESQLFunction) {
  return getFunctionDefinition(node.name)?.type === FunctionDefinitionTypes.OPERATOR;
}

async function getListArgsSuggestions(
  innerText: string,
  commands: ESQLCommand[],
  getFieldsByType: GetColumnsByTypeFn,
  fieldsMap: Map<string, ESQLFieldWithMetadata>,
  offset: number
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

    const anyUserDefinedColumns = collectUserDefinedColumns(commands, fieldsMap, innerText);
    // extract the current node from the userDefinedColumns inferred
    anyUserDefinedColumns.forEach((values, key) => {
      if (values.some((v) => v.location === node.location)) {
        anyUserDefinedColumns.delete(key);
      }
    });
    const [firstArg] = node.args;
    if (isColumn(firstArg)) {
      const argType = extractTypeFromASTArg(firstArg, {
        fields: fieldsMap,
        userDefinedColumns: anyUserDefinedColumns,
      });
      if (argType) {
        // do not propose existing columns again
        const otherArgs = isList(list)
          ? list.values
          : node.args.filter(Array.isArray).flat().filter(isColumn);
        suggestions.push(
          ...(await getFieldsOrFunctionsSuggestions(
            [argType as string],
            getLocationFromCommandOrOptionName(command.name),
            getFieldsByType,
            {
              functions: true,
              fields: true,
              userDefinedColumns: anyUserDefinedColumns,
            },
            { ignoreColumns: [firstArg.name, ...otherArgs.map(({ name }) => name)] }
          ))
        );
      }
    }
  }
  return suggestions;
}

export const getInsideFunctionsSuggestions = async (
  query: string,
  cursorPosition?: number,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext
) => {
  const innerText = query.substring(0, cursorPosition);
  const correctedQuery = correctQuerySyntax(innerText);
  const { ast } = parse(correctedQuery, { withFormatting: true });
  let withinStatsWhereClause = false;
  Walker.walk(ast, {
    visitFunction: (fn) => {
      if (fn.name === 'where' && within(cursorPosition ?? 0, fn.location)) {
        withinStatsWhereClause = true;
      }
    },
  });
  const { node, command } = findAstPosition(ast, cursorPosition ?? 0);
  if (!node) {
    return undefined;
  }
  if (node.type === 'function') {
    if (['in', 'not in'].includes(node.name)) {
      // // command ... a in ( <here> )
      // return { type: 'list' as const, command, node, option, containingFunction };
      return getListArgsSuggestions(
        innerText,
        ast,
        callbacks?.getByType ?? (() => Promise.resolve([])),
        context?.fields ?? new Map(),
        cursorPosition ?? 0
      );
    }
    if (!isOperator(node) || (command.name === 'stats' && !withinStatsWhereClause)) {
      // command ... fn( <here> )
      return await getFunctionArgsSuggestions(
        innerText,
        ast,
        callbacks?.getByType ?? (() => Promise.resolve([])),
        query,
        cursorPosition ?? 0,
        context
      );
    }
  }

  return undefined;
};
