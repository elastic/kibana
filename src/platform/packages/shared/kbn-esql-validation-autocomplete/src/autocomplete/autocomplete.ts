/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstQueryExpression, ESQLColumn } from '@kbn/esql-ast';
import {
  ESQL_VARIABLES_PREFIX,
  EsqlQuery,
  Walker,
  esqlCommandRegistry,
  getCommandAutocompleteDefinitions,
  parse,
  type ESQLAstItem,
  type ESQLCommand,
  type ESQLCommandOption,
  type ESQLFunction,
} from '@kbn/esql-ast';
import { getRecommendedQueriesSuggestionsFromStaticTemplates } from '@kbn/esql-ast/src/commands_registry/options/recommended_queries';
import type {
  ESQLColumnData,
  GetColumnsByTypeFn,
  ISuggestionItem,
} from '@kbn/esql-ast/src/commands_registry/types';
import {
  buildFieldsDefinitionsWithMetadata,
  getControlSuggestionIfSupported,
} from '@kbn/esql-ast/src/definitions/utils';
import { correctQuerySyntax } from '@kbn/esql-ast/src/definitions/utils/ast';
import { ESQLVariableType } from '@kbn/esql-types';
import type { LicenseType } from '@kbn/licensing-types';
import { getAstContext } from '../shared/context';
import { isSourceCommand } from '../shared/helpers';
import { getColumnsByTypeHelper, getSourcesHelper } from '../shared/resources_helpers';
import type { ESQLCallbacks } from '../shared/types';
import { getCommandContext } from './get_command_context';
import { mapRecommendedQueriesFromExtensions } from './utils/recommended_queries_helpers';

type GetColumnMapFn = () => Promise<Map<string, ESQLColumnData>>;

export async function suggest(
  fullText: string,
  offset: number,
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

  const { getColumnsByType, getColumnMap } = getColumnsByTypeRetriever(
    root,
    innerText,
    resourceRetriever
  );

  const supportsControls = resourceRetriever?.canSuggestVariables?.() ?? false;
  const getVariables = resourceRetriever?.getVariables;
  const getSources = getSourcesHelper(resourceRetriever);

  const activeProduct = resourceRetriever?.getActiveProduct?.();
  const licenseInstance = await resourceRetriever?.getLicense?.();
  const hasMinimumLicenseRequired = licenseInstance?.hasAtLeast;

  if (astContext.type === 'newCommand') {
    // propose main commands here
    // resolve particular commands suggestions after
    // filter source commands if already defined
    const commands = esqlCommandRegistry
      .getAllCommands()
      .filter((command) => {
        const license = command.metadata?.license;
        const observabilityTier = command.metadata?.observabilityTier;

        // Check license requirements
        const hasLicenseAccess =
          !license || hasMinimumLicenseRequired?.(license.toLocaleLowerCase() as LicenseType);

        // Check observability tier requirements
        const hasObservabilityAccess =
          !observabilityTier ||
          !activeProduct ||
          activeProduct.type !== 'observability' ||
          activeProduct.tier === observabilityTier.toLocaleLowerCase();

        return hasLicenseAccess && hasObservabilityAccess;
      })
      .map((command) => command.name);

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

        const { getColumnsByType: getColumnsByTypeEmptyState } = getColumnsByTypeRetriever(
          EsqlQuery.fromSrc(fromCommand).ast,
          innerText,
          resourceRetriever
        );
        const editorExtensions = (await resourceRetriever?.getEditorExtensions?.(fromCommand)) ?? {
          recommendedQueries: [],
        };
        const recommendedQueriesSuggestionsFromExtensions = mapRecommendedQueriesFromExtensions(
          editorExtensions.recommendedQueries
        );

        const recommendedQueriesSuggestionsFromStaticTemplates =
          await getRecommendedQueriesSuggestionsFromStaticTemplates(
            getColumnsByTypeEmptyState,
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
      getColumnsByType,
      getColumnMap,
      resourceRetriever,
      offset,
      hasMinimumLicenseRequired
    );
    return commandsSpecificSuggestions;
  }
  return [];
}

export function getColumnsByTypeRetriever(
  query: ESQLAstQueryExpression,
  queryText: string,
  resourceRetriever?: ESQLCallbacks
): { getColumnsByType: GetColumnsByTypeFn; getColumnMap: GetColumnMapFn } {
  const helpers = getColumnsByTypeHelper(query, queryText, resourceRetriever);
  const getVariables = resourceRetriever?.getVariables;
  const canSuggestVariables = resourceRetriever?.canSuggestVariables?.() ?? false;

  const queryString = queryText;
  const lastCharacterTyped = queryString[queryString.length - 1];
  const lastCharIsQuestionMark = lastCharacterTyped === ESQL_VARIABLES_PREFIX;
  return {
    getColumnsByType: async (
      expectedType: Readonly<string> | Readonly<string[]> = 'any',
      ignored: string[] = [],
      options
    ) => {
      const updatedOptions = {
        ...options,
        supportsControls: canSuggestVariables && !lastCharIsQuestionMark,
      };
      const editorExtensions = (await resourceRetriever?.getEditorExtensions?.(queryText)) ?? {
        recommendedQueries: [],
        recommendedFields: [],
      };
      const recommendedFieldsFromExtensions = editorExtensions.recommendedFields;
      const columns = await helpers.getColumnsByType(expectedType, ignored);
      return buildFieldsDefinitionsWithMetadata(
        columns,
        recommendedFieldsFromExtensions,
        updatedOptions,
        await getVariables?.()
      );
    },
    getColumnMap: helpers.getColumnMap,
  };
}

function findNewUserDefinedColumn(userDefinedColumns: Set<string>) {
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
  getColumnMap: GetColumnMapFn,
  callbacks?: ESQLCallbacks,
  offset?: number,
  hasMinimumLicenseRequired?: (minimumLicenseRequired: LicenseType) => boolean
) {
  const innerText = fullText.substring(0, offset);
  const commandDefinition = esqlCommandRegistry.getCommandByName(astContext.command.name);

  if (!commandDefinition) {
    return [];
  }

  // collect all fields + userDefinedColumns to suggest
  const columnMap: Map<string, ESQLColumnData> = await getColumnMap();
  const references = { columns: columnMap };

  const getSuggestedUserDefinedColumnName = () => {
    const allUserDefinedColumns = new Set(
      Walker.findAll(commands, (node) => node.type === 'column').map((col) =>
        (col as ESQLColumn).parts.join('.')
      )
    );
    return findNewUserDefinedColumn(allUserDefinedColumns);
  };

  const additionalCommandContext = await getCommandContext(
    astContext.command.name,
    innerText,
    callbacks
  );
  const context = {
    ...references,
    ...additionalCommandContext,
    activeProduct: callbacks?.getActiveProduct?.(),
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
      hasMinimumLicenseRequired,
      canCreateLookupIndex: callbacks?.canCreateLookupIndex,
    },
    context,
    offset
  );
}
