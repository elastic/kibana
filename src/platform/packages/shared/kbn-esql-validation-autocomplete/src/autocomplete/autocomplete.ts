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
  type AstProviderFn,
  type ESQLAstItem,
  type ESQLCommand,
  type ESQLCommandOption,
  type ESQLFunction,
  type ESQLSingleAstItem,
} from '@kbn/esql-ast';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { isNumericType } from '../shared/esql_types';
import type { EditorContext, ItemKind, SuggestionRawDefinition, GetColumnsByTypeFn } from './types';
import {
  getCommandDefinition,
  getFunctionDefinition,
  isColumnItem,
  isFunctionItem,
  isLiteralItem,
  isOptionItem,
  isSourceCommand,
  getAllFunctions,
  isSingleItem,
  getColumnExists,
  correctQuerySyntax,
  getColumnByName,
  getAllCommands,
  getExpressionType,
} from '../shared/helpers';
import { collectVariables, excludeVariablesFromCurrentCommand } from '../shared/variables';
import type { ESQLRealField, ESQLVariable } from '../validation/types';
import {
  allStarConstant,
  commaCompleteItem,
  getCommandAutocompleteDefinitions,
} from './complete_items';
import {
  buildPoliciesDefinitions,
  getFunctionSuggestions,
  getCompatibleLiterals,
  buildValueDefinitions,
  getDateLiterals,
  buildFieldsDefinitionsWithMetadata,
} from './factories';
import { EDITOR_MARKER, FULL_TEXT_SEARCH_FUNCTIONS } from '../shared/constants';
import { getAstContext } from '../shared/context';
import {
  buildQueryUntilPreviousCommand,
  getFieldsByTypeHelper,
  getPolicyHelper,
  getSourcesHelper,
} from '../shared/resources_helpers';
import type { ESQLCallbacks, ESQLSourceResult } from '../shared/types';
import {
  getFunctionsToIgnoreForStats,
  getQueryForFields,
  getSourcesFromCommands,
  isAggFunctionUsedAlready,
  getValidSignaturesAndTypesToSuggestNext,
  getFieldsOrFunctionsSuggestions,
  pushItUpInTheList,
  extractTypeFromASTArg,
  getSuggestionsToRightOfOperatorExpression,
} from './helper';
import {
  FunctionParameter,
  FunctionDefinitionTypes,
  GetPolicyMetadataFn,
} from '../definitions/types';
import { comparisonFunctions } from '../definitions/all_operators';
import { getRecommendedQueriesSuggestions } from './recommended_queries/suggestions';

type GetFieldsMapFn = () => Promise<Map<string, ESQLRealField>>;
type GetPoliciesFn = () => Promise<SuggestionRawDefinition[]>;

export async function suggest(
  fullText: string,
  offset: number,
  context: EditorContext,
  astProvider: AstProviderFn,
  resourceRetriever?: ESQLCallbacks
): Promise<SuggestionRawDefinition[]> {
  // Partition out to inner ast / ast context for the latest command
  const innerText = fullText.substring(0, offset);
  const correctedQuery = correctQuerySyntax(innerText, context);
  const { ast } = await astProvider(correctedQuery);
  const astContext = getAstContext(innerText, ast, offset);

  if (astContext.type === 'comment') {
    return [];
  }

  // build the correct query to fetch the list of fields
  const queryForFields = getQueryForFields(
    buildQueryUntilPreviousCommand(ast, correctedQuery),
    ast
  );

  const { getFieldsByType, getFieldsMap } = getFieldsByTypeRetriever(
    queryForFields.replace(EDITOR_MARKER, ''),
    resourceRetriever
  );
  const supportsControls = resourceRetriever?.canSuggestVariables?.() ?? false;
  const getVariables = resourceRetriever?.getVariables;
  const getSources = getSourcesHelper(resourceRetriever);
  const { getPolicies, getPolicyMetadata } = getPolicyRetriever(resourceRetriever);

  if (astContext.type === 'newCommand') {
    // propose main commands here
    // filter source commands if already defined
    const suggestions = getCommandAutocompleteDefinitions(getAllCommands());
    if (!ast.length) {
      // Display the recommended queries if there are no commands (empty state)
      const recommendedQueriesSuggestions: SuggestionRawDefinition[] = [];
      if (getSources) {
        let fromCommand = '';
        const sources = await getSources();
        const visibleSources = sources.filter((source) => !source.hidden);
        if (visibleSources.find((source) => source.name.startsWith('logs'))) {
          fromCommand = 'FROM logs*';
        } else fromCommand = `FROM ${visibleSources[0].name}`;

        const { getFieldsByType: getFieldsByTypeEmptyState } = getFieldsByTypeRetriever(
          fromCommand,
          resourceRetriever
        );
        recommendedQueriesSuggestions.push(
          ...(await getRecommendedQueriesSuggestions(getFieldsByTypeEmptyState, fromCommand))
        );
      }
      const sourceCommandsSuggestions = suggestions.filter(isSourceCommand);
      return [...sourceCommandsSuggestions, ...recommendedQueriesSuggestions];
    }

    return suggestions.filter((def) => !isSourceCommand(def));
  }

  if (astContext.type === 'expression') {
    return getSuggestionsWithinCommandExpression(
      innerText,
      ast,
      astContext,
      getSources,
      getFieldsByType,
      getFieldsMap,
      getPolicies,
      getPolicyMetadata,
      getVariables,
      resourceRetriever?.getPreferences,
      resourceRetriever,
      supportsControls
    );
  }
  if (astContext.type === 'function') {
    return getFunctionArgsSuggestions(
      innerText,
      ast,
      astContext,
      getFieldsByType,
      getFieldsMap,
      fullText,
      offset,
      getVariables,
      supportsControls
    );
  }
  if (astContext.type === 'list') {
    return getListArgsSuggestions(
      innerText,
      ast,
      astContext,
      getFieldsByType,
      getFieldsMap,
      getPolicyMetadata
    );
  }
  return [];
}

export function getFieldsByTypeRetriever(
  queryString: string,
  resourceRetriever?: ESQLCallbacks
): { getFieldsByType: GetColumnsByTypeFn; getFieldsMap: GetFieldsMapFn } {
  const helpers = getFieldsByTypeHelper(queryString, resourceRetriever);
  const getVariables = resourceRetriever?.getVariables;
  const supportsControls = resourceRetriever?.canSuggestVariables?.() ?? false;
  return {
    getFieldsByType: async (
      expectedType: Readonly<string> | Readonly<string[]> = 'any',
      ignored: string[] = [],
      options
    ) => {
      const updatedOptions = {
        ...options,
        supportsControls,
      };
      const fields = await helpers.getFieldsByType(expectedType, ignored);
      return buildFieldsDefinitionsWithMetadata(fields, updatedOptions, getVariables);
    },
    getFieldsMap: helpers.getFieldsMap,
  };
}

function getPolicyRetriever(resourceRetriever?: ESQLCallbacks) {
  const helpers = getPolicyHelper(resourceRetriever);
  return {
    getPolicies: async () => {
      const policies = await helpers.getPolicies();
      return buildPoliciesDefinitions(policies);
    },
    getPolicyMetadata: helpers.getPolicyMetadata,
  };
}

function findNewVariable(variables: Map<string, ESQLVariable[]>) {
  let autoGeneratedVariableCounter = 0;
  let name = `var${autoGeneratedVariableCounter++}`;
  while (variables.has(name)) {
    name = `var${autoGeneratedVariableCounter++}`;
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
  getSources: () => Promise<ESQLSourceResult[]>,
  getColumnsByType: GetColumnsByTypeFn,
  getFieldsMap: GetFieldsMapFn,
  getPolicies: GetPoliciesFn,
  getPolicyMetadata: GetPolicyMetadataFn,
  getVariables?: () => ESQLControlVariable[] | undefined,
  getPreferences?: () => Promise<{ histogramBarTarget: number } | undefined>,
  callbacks?: ESQLCallbacks,
  supportsControls?: boolean
) {
  const commandDef = getCommandDefinition(astContext.command.name);

  // collect all fields + variables to suggest
  const fieldsMap: Map<string, ESQLRealField> = await getFieldsMap();
  const anyVariables = collectVariables(commands, fieldsMap, innerText);

  const references = { fields: fieldsMap, variables: anyVariables };

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
      commandName: astContext.command.name,
      optionName: astContext.option?.name,
      rootOperator: astContext.node,
      getExpressionType: (expression) =>
        getExpressionType(expression, references.fields, references.variables),
      getColumnsByType,
    });
  }

  return commandDef.suggest({
    innerText,
    command: astContext.command,
    getColumnsByType,
    getAllColumnNames: () => Array.from(fieldsMap.keys()),
    columnExists: (col: string) => Boolean(getColumnByName(col, references)),
    getSuggestedVariableName: (extraFieldNames?: string[]) => {
      if (!extraFieldNames?.length) {
        return findNewVariable(anyVariables);
      }

      const augmentedFieldsMap = new Map(fieldsMap);
      extraFieldNames.forEach((name) => {
        augmentedFieldsMap.set(name, { name, type: 'double' });
      });
      return findNewVariable(collectVariables(commands, augmentedFieldsMap, innerText));
    },
    getExpressionType: (expression: ESQLAstItem | undefined) =>
      getExpressionType(expression, references.fields, references.variables),
    getPreferences,
    definition: commandDef,
    getSources,
    getRecommendedQueriesSuggestions: (prefix) =>
      getRecommendedQueriesSuggestions(getColumnsByType, prefix),
    getSourcesFromQuery: (type) => getSourcesFromCommands(commands, type),
    previousCommands: commands,
    callbacks,
    getVariables,
    supportsControls,
    getPolicies,
    getPolicyMetadata,
  });
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
): Promise<SuggestionRawDefinition[]> {
  const fnDefinition = getFunctionDefinition(node.name);
  // early exit on no hit
  if (!fnDefinition) {
    return [];
  }
  const fieldsMap: Map<string, ESQLRealField> = await getFieldsMap();
  const anyVariables = collectVariables(commands, fieldsMap, innerText);

  const references = {
    fields: fieldsMap,
    variables: anyVariables,
  };
  const variablesExcludingCurrentCommandOnes = excludeVariablesFromCurrentCommand(
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

  const suggestions: SuggestionRawDefinition[] = [];
  const noArgDefined = !arg;
  const isUnknownColumn =
    arg &&
    isColumnItem(arg) &&
    !getColumnExists(arg, {
      fields: fieldsMap,
      variables: variablesExcludingCurrentCommandOnes,
    });
  if (noArgDefined || isUnknownColumn) {
    // ... | EVAL fn( <suggest>)
    // ... | EVAL fn( field, <suggest>)

    const commandArgIndex = command.args.findIndex(
      (cmdArg) => isSingleItem(cmdArg) && cmdArg.location.max >= node.location.max
    );
    const finalCommandArgIndex =
      command.name !== 'stats'
        ? -1
        : commandArgIndex < 0
        ? Math.max(command.args.length - 1, 0)
        : commandArgIndex;

    const finalCommandArg = command.args[finalCommandArgIndex];

    const fnToIgnore = [];
    // just ignore the current function
    if (
      command.name !== 'stats' ||
      (isOptionItem(finalCommandArg) && finalCommandArg.name === 'by')
    ) {
      fnToIgnore.push(node.name);
    } else {
      fnToIgnore.push(
        ...getFunctionsToIgnoreForStats(command, finalCommandArgIndex),
        // ignore grouping functions, they are only used for grouping
        ...getAllFunctions({ type: FunctionDefinitionTypes.GROUPING }).map(({ name }) => name),
        ...(isAggFunctionUsedAlready(command, finalCommandArgIndex)
          ? getAllFunctions({ type: FunctionDefinitionTypes.AGG }).map(({ name }) => name)
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
      (p) => p.constantOnly || /_literal/.test(p.type as string)
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

    // Fields

    suggestions.push(
      ...pushItUpInTheList(
        await getFieldsByType(
          // For example, in case() where we are expecting a boolean condition
          // we can accept any field types (field1 !== field2)
          canBeBooleanCondition
            ? ['any']
            : // @TODO: have a way to better suggest constant only params
              (getTypesFromParamDefs(
                typesToSuggestNext.filter((d) => !d.constantOnly)
              ) as string[]),
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
      suggestions.push(
        ...getFunctionSuggestions({
          command: command.name,
          option: option?.name,
          returnTypes: canBeBooleanCondition
            ? ['any']
            : (getTypesFromParamDefs(typesToSuggestNext) as string[]),
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
      if (isLiteralItem(arg) && isNumericType(arg.literalType)) {
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
        ...comparisonFunctions.map<SuggestionRawDefinition>(({ name, description }) => ({
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
  getFieldsMaps: GetFieldsMapFn,
  getPolicyMetadata: GetPolicyMetadataFn
) {
  const suggestions = [];
  // node is supposed to be the function who support a list argument (like the "in" operator)
  // so extract the type of the first argument and suggest fields of that type
  if (node && isFunctionItem(node)) {
    const fieldsMap: Map<string, ESQLRealField> = await getFieldsMaps();
    const anyVariables = collectVariables(commands, fieldsMap, innerText);
    // extract the current node from the variables inferred
    anyVariables.forEach((values, key) => {
      if (values.some((v) => v.location === node.location)) {
        anyVariables.delete(key);
      }
    });
    const [firstArg] = node.args;
    if (isColumnItem(firstArg)) {
      const argType = extractTypeFromASTArg(firstArg, {
        fields: fieldsMap,
        variables: anyVariables,
      });
      if (argType) {
        // do not propose existing columns again
        const otherArgs = node.args.filter(Array.isArray).flat().filter(isColumnItem);
        suggestions.push(
          ...(await getFieldsOrFunctionsSuggestions(
            [argType as string],
            command.name,
            undefined,
            getFieldsByType,
            {
              functions: true,
              fields: true,
              variables: anyVariables,
            },
            { ignoreColumns: [firstArg.name, ...otherArgs.map(({ name }) => name)] }
          ))
        );
      }
    }
  }
  return suggestions;
}
