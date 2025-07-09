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
  parse,
  type ESQLAstItem,
  type ESQLCommand,
  type ESQLCommandOption,
  type ESQLFunction,
  type ESQLSingleAstItem,
  Walker,
  esqlCommandRegistry,
  getCommandAutocompleteDefinitions,
  commaCompleteItem,
  listCompleteItem,
  allStarConstant,
  FULL_TEXT_SEARCH_FUNCTIONS,
  ESQL_VARIABLES_PREFIX,
  isNumericType,
  FunctionParameterType,
  FunctionDefinitionTypes,
  FunctionParameter,
  isList,
  isColumn,
  isOptionNode,
  isLiteral,
  isFunctionExpression,
} from '@kbn/esql-ast';
import { Location } from '@kbn/esql-ast/src/commands_registry/types';
import { comparisonFunctions } from '@kbn/esql-ast/src/definitions/all_operators';
import { EDITOR_MARKER } from '@kbn/esql-ast/src/parser/constants';
import {
  getDateLiterals,
  getCompatibleLiterals,
  getFieldsOrFunctionsSuggestions,
  getControlSuggestionIfSupported,
  pushItUpInTheList,
  getSuggestionsToRightOfOperatorExpression,
  buildFieldsDefinitionsWithMetadata,
  getFunctionSuggestions,
  getExpressionType,
  getFunctionDefinition,
} from '@kbn/esql-ast/src/definitions/utils';
import { getRecommendedQueriesSuggestionsFromStaticTemplates } from '@kbn/esql-ast/src/commands_registry/options/recommended_queries';
import {
  ESQLUserDefinedColumn,
  ESQLFieldWithMetadata,
  GetColumnsByTypeFn,
  ISuggestionItem,
  ItemKind,
} from '@kbn/esql-ast/src/commands_registry/types';
import { type ESQLControlVariable, ESQLVariableType } from '@kbn/esql-types';
import type { EditorContext } from './types';
import { isSourceCommand, getAllFunctions, getColumnExists } from '../shared/helpers';
import {
  collectUserDefinedColumns,
  excludeUserDefinedColumnsFromCurrentCommand,
} from '../shared/user_defined_columns';
import { buildValueDefinitions } from './factories';
import { getAstContext } from '../shared/context';
import { getFieldsByTypeHelper, getSourcesHelper } from '../shared/resources_helpers';
import type { ESQLCallbacks } from '../shared/types';
import {
  getFunctionsToIgnoreForStats,
  getQueryForFields,
  isAggFunctionUsedAlready,
  getValidSignaturesAndTypesToSuggestNext,
  extractTypeFromASTArg,
  correctQuerySyntax,
  isTimeseriesAggUsedAlready,
} from './helper';
import { getLocationFromCommandOrOptionName } from '../shared/types';
import { mapRecommendedQueriesFromExtensions } from './utils/recommended_queries_helpers';
import { getCommandContext } from './get_command_context';

type GetFieldsMapFn = () => Promise<Map<string, ESQLFieldWithMetadata>>;

export async function suggest(
  fullText: string,
  offset: number,
  context: EditorContext,
  resourceRetriever?: ESQLCallbacks
): Promise<ISuggestionItem[]> {
  // Partition out to inner ast / ast context for the latest command
  const innerText = fullText.substring(0, offset);
  const correctedQuery = correctQuerySyntax(innerText);
  const { ast, root } = parse(correctedQuery, { withFormatting: true });
  const astContext = getAstContext(innerText, ast, offset);

  if (astContext.type === 'comment') {
    return [];
  }

  // build the correct query to fetch the list of fields
  const queryForFields = getQueryForFields(correctedQuery, root);

  const { getFieldsByType, getFieldsMap } = getFieldsByTypeRetriever(
    queryForFields.replace(EDITOR_MARKER, ''),
    resourceRetriever,
    innerText
  );
  const supportsControls = resourceRetriever?.canSuggestVariables?.() ?? false;
  const getVariables = resourceRetriever?.getVariables;
  const getSources = getSourcesHelper(resourceRetriever);

  if (astContext.type === 'newCommand') {
    // propose main commands here
    // resolve particular commands suggestions after
    // filter source commands if already defined
    const commands = esqlCommandRegistry.getAllCommandNames();
    const suggestions = getCommandAutocompleteDefinitions(commands);
    if (!ast.length) {
      // Display the recommended queries if there are no commands (empty state)
      const recommendedQueriesSuggestions: ISuggestionItem[] = [];
      if (getSources) {
        let fromCommand = '';
        const sources = await getSources();
        const visibleSources = sources.filter((source) => !source.hidden);
        if (visibleSources.find((source) => source.name.startsWith('logs'))) {
          fromCommand = 'FROM logs*';
        } else if (visibleSources.length) {
          fromCommand = `FROM ${visibleSources[0].name}`;
        }

        const { getFieldsByType: getFieldsByTypeEmptyState } = getFieldsByTypeRetriever(
          fromCommand,
          resourceRetriever,
          innerText
        );
        const editorExtensions = (await resourceRetriever?.getEditorExtensions?.(fromCommand)) ?? {
          recommendedQueries: [],
        };
        const recommendedQueriesSuggestionsFromExtensions = mapRecommendedQueriesFromExtensions(
          editorExtensions.recommendedQueries
        );

        const recommendedQueriesSuggestionsFromStaticTemplates =
          await getRecommendedQueriesSuggestionsFromStaticTemplates(
            getFieldsByTypeEmptyState,
            fromCommand
          );
        recommendedQueriesSuggestions.push(
          ...recommendedQueriesSuggestionsFromExtensions,
          ...recommendedQueriesSuggestionsFromStaticTemplates
        );
      }
      const sourceCommandsSuggestions = suggestions.filter(isSourceCommand);
      return [...sourceCommandsSuggestions, ...recommendedQueriesSuggestions];
    }

    return suggestions.filter((def) => !isSourceCommand(def));
  }

  // ToDo: Reconsider where it belongs when this is resolved https://github.com/elastic/kibana/issues/216492
  const lastCharacterTyped = innerText[innerText.length - 1];
  let controlSuggestions: ISuggestionItem[] = [];
  if (lastCharacterTyped === ESQL_VARIABLES_PREFIX) {
    controlSuggestions = getControlSuggestionIfSupported(
      Boolean(supportsControls),
      ESQLVariableType.VALUES,
      await getVariables?.(),
      false
    );

    return controlSuggestions;
  }

  if (astContext.type === 'expression') {
    const commandsSpecificSuggestions = await getSuggestionsWithinCommandExpression(
      innerText,
      ast,
      astContext,
      getFieldsByType,
      getFieldsMap,
      resourceRetriever
    );
    return commandsSpecificSuggestions;
  }
  if (astContext.type === 'function') {
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

    const functionsSpecificSuggestions = await getFunctionArgsSuggestions(
      innerText,
      ast,
      {
        ...astContext,
        ...(astContext.command.name === 'fork'
          ? getCommandAndOptionWithinFORK(astContext.command as ESQLCommand<'fork'>)
          : {}),
      },
      getFieldsByType,
      getFieldsMap,
      fullText,
      offset,
      getVariables,
      supportsControls
    );
    return functionsSpecificSuggestions;
  }
  if (astContext.type === 'list') {
    return getListArgsSuggestions(innerText, ast, astContext, getFieldsByType, getFieldsMap);
  }
  return [];
}

export function getFieldsByTypeRetriever(
  queryForFields: string,
  resourceRetriever?: ESQLCallbacks,
  fullQuery?: string
): { getFieldsByType: GetColumnsByTypeFn; getFieldsMap: GetFieldsMapFn } {
  const helpers = getFieldsByTypeHelper(queryForFields, resourceRetriever);
  const getVariables = resourceRetriever?.getVariables;
  const canSuggestVariables = resourceRetriever?.canSuggestVariables?.() ?? false;

  const queryString = fullQuery ?? queryForFields;
  const lastCharacterTyped = queryString[queryString.length - 1];
  const lastCharIsQuestionMark = lastCharacterTyped === ESQL_VARIABLES_PREFIX;
  return {
    getFieldsByType: async (
      expectedType: Readonly<string> | Readonly<string[]> = 'any',
      ignored: string[] = [],
      options
    ) => {
      const updatedOptions = {
        ...options,
        supportsControls: canSuggestVariables && !lastCharIsQuestionMark,
      };
      const editorExtensions = (await resourceRetriever?.getEditorExtensions?.(queryForFields)) ?? {
        recommendedQueries: [],
        recommendedFields: [],
      };
      const recommendedFieldsFromExtensions = editorExtensions.recommendedFields;
      const fields = await helpers.getFieldsByType(expectedType, ignored);
      return buildFieldsDefinitionsWithMetadata(
        fields,
        recommendedFieldsFromExtensions,
        updatedOptions,
        await getVariables?.()
      );
    },
    getFieldsMap: helpers.getFieldsMap,
  };
}

function findNewUserDefinedColumn(userDefinedColumns: Map<string, ESQLUserDefinedColumn[]>) {
  let autoGeneratedColumnCounter = 0;
  let name = `col${autoGeneratedColumnCounter++}`;
  while (userDefinedColumns.has(name)) {
    name = `col${autoGeneratedColumnCounter++}`;
  }
  return name;
}

async function getSuggestionsWithinCommandExpression(
  innerText: string,
  commands: ESQLCommand[],
  astContext: {
    command: ESQLCommand;
    node?: ESQLAstItem;
    option?: ESQLCommandOption;
    containingFunction?: ESQLFunction;
  },
  getColumnsByType: GetColumnsByTypeFn,
  getFieldsMap: GetFieldsMapFn,
  callbacks?: ESQLCallbacks
) {
  const commandDefinition = esqlCommandRegistry.getCommandByName(astContext.command.name);

  if (!commandDefinition) {
    return [];
  }

  // collect all fields + userDefinedColumns to suggest
  const fieldsMap: Map<string, ESQLFieldWithMetadata> = await getFieldsMap();
  const anyUserDefinedColumns = collectUserDefinedColumns(commands, fieldsMap, innerText);

  const references = { fields: fieldsMap, userDefinedColumns: anyUserDefinedColumns };

  // For now, we don't suggest for expressions within any function besides CASE
  // e.g. CASE(field != /)
  //
  // So, it is handled as a special branch...
  if (
    astContext.containingFunction?.name === 'case' &&
    !Array.isArray(astContext.node) &&
    astContext.node?.type === 'function' &&
    astContext.node?.subtype === 'binary-expression'
  ) {
    return await getSuggestionsToRightOfOperatorExpression({
      queryText: innerText,
      location: getLocationFromCommandOrOptionName(astContext.command.name),
      rootOperator: astContext.node,
      getExpressionType: (expression) =>
        getExpressionType(expression, references.fields, references.userDefinedColumns),
      getColumnsByType,
    });
  }

  const getSuggestedUserDefinedColumnName = (extraFieldNames?: string[]) => {
    if (!extraFieldNames?.length) {
      return findNewUserDefinedColumn(anyUserDefinedColumns);
    }

    const augmentedFieldsMap = new Map(fieldsMap);
    extraFieldNames.forEach((name) => {
      augmentedFieldsMap.set(name, { name, type: 'double' });
    });
    return findNewUserDefinedColumn(
      collectUserDefinedColumns(commands, augmentedFieldsMap, innerText)
    );
  };

  const additionalCommandContext = await getCommandContext(
    astContext.command.name,
    innerText,
    callbacks
  );
  const context = {
    ...references,
    ...additionalCommandContext,
  };

  // does it make sense to have a different context per command?
  return commandDefinition.methods.autocomplete(
    innerText,
    astContext.command,
    {
      getByType: getColumnsByType,
      getSuggestedUserDefinedColumnName,
      getColumnsForQuery: callbacks?.getColumnsFor
        ? async (query: string) => {
            return await callbacks.getColumnsFor!({ query });
          }
        : undefined,
    },
    context
  );
}

const addCommaIf = (condition: boolean, text: string) => (condition ? `${text},` : text);

async function getFunctionArgsSuggestions(
  innerText: string,
  commands: ESQLCommand[],
  {
    command,
    option,
    node,
  }: {
    command: ESQLCommand;
    option: ESQLCommandOption | undefined;
    node: ESQLFunction;
  },
  getFieldsByType: GetColumnsByTypeFn,
  getFieldsMap: GetFieldsMapFn,
  fullText: string,
  offset: number,
  getVariables?: () => ESQLControlVariable[] | undefined,
  supportsControls?: boolean
): Promise<ISuggestionItem[]> {
  const fnDefinition = getFunctionDefinition(node.name);
  // early exit on no hit
  if (!fnDefinition) {
    return [];
  }
  const fieldsMap: Map<string, ESQLFieldWithMetadata> = await getFieldsMap();
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
    getValidSignaturesAndTypesToSuggestNext(node, references, fnDefinition, fullText, offset);
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

    if (node.subtype === 'variadic-call') {
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

    // Literals
    suggestions.push(
      ...getCompatibleLiterals(
        getTypesFromParamDefs(constantOnlyParamDefs) as string[],
        {
          addComma: shouldAddComma,
          advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs,
          supportsControls,
        },
        getVariables
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

async function getListArgsSuggestions(
  innerText: string,
  commands: ESQLCommand[],
  {
    command,
    node,
  }: {
    command: ESQLCommand;
    node: ESQLSingleAstItem | undefined;
  },
  getFieldsByType: GetColumnsByTypeFn,
  getFieldsMaps: GetFieldsMapFn
) {
  const suggestions = [];

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

    const fieldsMap: Map<string, ESQLFieldWithMetadata> = await getFieldsMaps();
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
