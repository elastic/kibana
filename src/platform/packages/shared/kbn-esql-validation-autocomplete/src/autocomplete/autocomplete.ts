/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  parse,
  type ESQLAstItem,
  type ESQLCommand,
  type ESQLCommandOption,
  type ESQLFunction,
  esqlCommandRegistry,
  getCommandAutocompleteDefinitions,
  ESQL_VARIABLES_PREFIX,
} from '@kbn/esql-ast';
import { EDITOR_MARKER } from '@kbn/esql-ast/src/parser/constants';
import {
  getControlSuggestionIfSupported,
  getSuggestionsToRightOfOperatorExpression,
  buildFieldsDefinitionsWithMetadata,
  getExpressionType,
} from '@kbn/esql-ast/src/definitions/utils';
import { getRecommendedQueriesSuggestionsFromStaticTemplates } from '@kbn/esql-ast/src/commands_registry/options/recommended_queries';
import {
  ESQLUserDefinedColumn,
  ESQLFieldWithMetadata,
  GetColumnsByTypeFn,
  ISuggestionItem,
} from '@kbn/esql-ast/src/commands_registry/types';
import { ESQLVariableType } from '@kbn/esql-types';
import type { EditorContext } from './types';
import { isSourceCommand } from '../shared/helpers';
import { collectUserDefinedColumns } from '../shared/user_defined_columns';
import { getAstContext } from '../shared/context';
import { getFieldsByTypeHelper, getSourcesHelper } from '../shared/resources_helpers';
import type { ESQLCallbacks } from '../shared/types';
import { getQueryForFields, correctQuerySyntax } from './helper';
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
      getVariables?.(),
      false
    );

    return controlSuggestions;
  }

  if (astContext.type === 'expression') {
    const commandsSpecificSuggestions = await getSuggestionsWithinCommandExpression(
      fullText,
      ast,
      astContext,
      getFieldsByType,
      getFieldsMap,
      resourceRetriever,
      offset
    );
    return commandsSpecificSuggestions;
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
  fullText: string,
  commands: ESQLCommand[],
  astContext: {
    command: ESQLCommand;
    node?: ESQLAstItem;
    option?: ESQLCommandOption;
    containingFunction?: ESQLFunction;
  },
  getColumnsByType: GetColumnsByTypeFn,
  getFieldsMap: GetFieldsMapFn,
  callbacks?: ESQLCallbacks,
  offset?: number
) {
  const innerText = fullText.substring(0, offset);
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
  const appId = await callbacks?.getCurrentAppId?.();
  const context = {
    ...references,
    ...additionalCommandContext,
    appId,
  };

  // does it make sense to have a different context per command?
  return commandDefinition.methods.autocomplete(
    fullText,
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
    context,
    offset
  );
}
