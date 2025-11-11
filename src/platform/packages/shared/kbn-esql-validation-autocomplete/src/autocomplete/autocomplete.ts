/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLColumn } from '@kbn/esql-ast';
import {
  ESQL_VARIABLES_PREFIX,
  EsqlQuery,
  Walker,
  esqlCommandRegistry,
  getCommandAutocompleteDefinitions,
  parse,
  type ESQLAstItem,
  type ESQLCommandOption,
  type ESQLFunction,
} from '@kbn/esql-ast';
import { getRecommendedQueriesSuggestionsFromStaticTemplates } from '@kbn/esql-ast/src/commands_registry/options/recommended_queries';
import type {
  ESQLColumnData,
  GetColumnsByTypeFn,
  ISuggestionItem,
} from '@kbn/esql-ast/src/commands_registry/types';
import { getControlSuggestionIfSupported } from '@kbn/esql-ast/src/definitions/utils';
import { correctQuerySyntax } from '@kbn/esql-ast/src/definitions/utils/ast';
import { ESQLVariableType } from '@kbn/esql-types';
import type { LicenseType } from '@kbn/licensing-types';
import type { ESQLAstAllCommands } from '@kbn/esql-ast/src/types';
import { getAstContext } from '../shared/context';
import { isHeaderCommandSuggestion, isSourceCommandSuggestion } from '../shared/helpers';
import { getFromCommandHelper } from '../shared/resources_helpers';
import type { ESQLCallbacks } from '../shared/types';
import { getCommandContext } from './get_command_context';
import { mapRecommendedQueriesFromExtensions } from './utils/recommended_queries_helpers';
import { getQueryForFields } from './get_query_for_fields';
import type { GetColumnMapFn } from '../shared/columns';
import { getColumnsByTypeRetriever } from '../shared/columns';

export async function suggest(
  fullText: string,
  offset: number,
  resourceRetriever?: ESQLCallbacks
): Promise<ISuggestionItem[]> {
  // Partition out to inner ast / ast context for the latest command
  const innerText = fullText.substring(0, offset);
  const correctedQuery = correctQuerySyntax(innerText);
  const { root } = parse(correctedQuery, { withFormatting: true });

  const astContext = getAstContext(innerText, root, offset);

  if (astContext.type === 'comment') {
    return [];
  }

  // Use the appropriate AST context for field retrieval
  // When in a subquery, use the subquery's AST to get only its fields
  const astForFields = astContext.isCursorInSubquery ? astContext.astForContext : root;

  const { getColumnsByType, getColumnMap } = getColumnsByTypeRetriever(
    getQueryForFields(correctedQuery, astForFields),
    innerText,
    resourceRetriever
  );

  const supportsControls = resourceRetriever?.canSuggestVariables?.() ?? false;
  const getVariables = resourceRetriever?.getVariables;

  const activeProduct = resourceRetriever?.getActiveProduct?.();
  const licenseInstance = await resourceRetriever?.getLicense?.();
  const hasMinimumLicenseRequired = licenseInstance?.hasAtLeast;

  if (astContext.type === 'newCommand') {
    // propose main commands here
    // resolve particular commands suggestions after
    // filter source commands if already defined

    const isStartingSubquery =
      astContext.isCursorInSubquery && !astContext.astForContext.commands.length;

    const commands = esqlCommandRegistry
      .getAllCommands({
        isCursorInSubquery: astContext.isCursorInSubquery,
        isStartingSubquery,
        queryContainsSubqueries: astContext.queryContainsSubqueries,
      })
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

    if (!astContext.astForContext.commands.length) {
      if (isStartingSubquery) {
        return suggestions;
      }

      // Root level empty state: show source commands + recommended queries
      const recommendedQueriesSuggestions: ISuggestionItem[] = [];
      const fromCommand = await getFromCommandHelper(resourceRetriever);

      const { getColumnsByType: getColumnsByTypeEmptyState } = getColumnsByTypeRetriever(
        EsqlQuery.fromSrc(fromCommand).ast,
        innerText,
        resourceRetriever
      );
      const editorExtensions = (await resourceRetriever?.getEditorExtensions?.('from *')) ?? {
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

      const sourceCommandsSuggestions = suggestions.filter(isSourceCommandSuggestion);
      const headerCommandsSuggestions = suggestions.filter(isHeaderCommandSuggestion);
      return [
        ...headerCommandsSuggestions,
        ...sourceCommandsSuggestions,
        ...recommendedQueriesSuggestions,
      ];
    }

    return suggestions.filter(
      (def) => !isSourceCommandSuggestion(def) && !isHeaderCommandSuggestion(def)
    );
  }

  // ToDo: Reconsider where it belongs when this is resolved https://github.com/elastic/kibana/issues/216492
  const lastCharacterTyped = innerText[innerText.length - 1];
  let controlSuggestions: ISuggestionItem[] = [];
  if (lastCharacterTyped === ESQL_VARIABLES_PREFIX) {
    controlSuggestions = getControlSuggestionIfSupported(
      Boolean(supportsControls),
      ESQLVariableType.VALUES,
      'question_mark',
      getVariables?.(),
      false
    );

    return controlSuggestions;
  }

  if (astContext.type === 'expression') {
    const commands = [...(root.header ?? []), ...root.commands];
    const commandsSpecificSuggestions = await getSuggestionsWithinCommandExpression(
      fullText,
      commands,
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
  commands: ESQLAstAllCommands[],
  astContext: {
    command: ESQLAstAllCommands;
    node?: ESQLAstItem;
    option?: ESQLCommandOption;
    containingFunction?: ESQLFunction;
    isCursorInSubquery: boolean;
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
    isCursorInSubquery: astContext.isCursorInSubquery,
  };

  // does it make sense to have a different context per command?
  const suggestions = await commandDefinition.methods.autocomplete(
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
      isServerless: callbacks?.isServerless,
    },
    context,
    offset
  );

  return suggestions;
}
