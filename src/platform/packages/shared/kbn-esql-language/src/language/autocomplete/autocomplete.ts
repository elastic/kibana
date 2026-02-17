/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ControlTriggerSource, ESQLVariableType, type ESQLCallbacks } from '@kbn/esql-types';
import type { LicenseType } from '@kbn/licensing-types';
import type {
  ESQLColumn,
  ESQLAstItem,
  ESQLCommandOption,
  ESQLFunction,
  ESQLAstAllCommands,
} from '../../types';
import { EsqlQuery } from '../../composer';
import { esqlCommandRegistry } from '../../commands';
import { isHeaderCommand, Walker } from '../../ast';
import { parse } from '../../parser';
import {
  getCommandAutocompleteDefinitions,
  createIndicesBrowserSuggestion,
} from '../../commands/registry/complete_items';
import { SuggestionOrderingEngine } from './utils';
import { ESQL_VARIABLES_PREFIX } from '../../commands/registry/constants';
import { getRecommendedQueriesSuggestionsFromStaticTemplates } from '../../commands/registry/options/recommended_queries';
import type {
  ESQLColumnData,
  GetColumnsByTypeFn,
  ISuggestionItem,
} from '../../commands/registry/types';
import { getControlSuggestionIfSupported } from '../../commands/definitions/utils';
import { correctQuerySyntax } from '../../commands/definitions/utils/ast';
import { getCursorContext } from '../shared/get_cursor_context';
import { getFromCommandHelper } from '../shared/resources_helpers';
import { getCommandContext } from './get_command_context';
import { buildResourceBrowserCommandArgs } from './autocomplete_utils';
import { mapRecommendedQueriesFromExtensions } from './recommended_queries_helpers';
import { getQueryForFields } from '../shared/get_query_for_fields';
import type { GetColumnMapFn } from '../shared/columns_retrieval_helpers';
import { getColumnsByTypeRetriever } from '../shared/columns_retrieval_helpers';
import { getUnmappedFieldsStrategy } from '../../commands/definitions/utils/settings';

function isSourceCommandSuggestion({ label }: { label: string }) {
  const sourceCommands = esqlCommandRegistry
    .getSourceCommandNames()
    .map((cmd) => cmd.toUpperCase());

  return sourceCommands.includes(label);
}
function isHeaderCommandSuggestion({ label }: { label: string }) {
  return label === 'SET';
}

const orderingEngine = new SuggestionOrderingEngine();

export async function suggest(
  fullText: string,
  offset: number,
  resourceRetriever?: ESQLCallbacks
): Promise<ISuggestionItem[]> {
  const innerText = fullText.substring(0, offset);
  const correctedQuery = correctQuerySyntax(innerText);
  const { root } = parse(correctedQuery, { withFormatting: true });

  const astContext = getCursorContext(innerText, root, offset);

  if (astContext.type === 'comment') {
    return [];
  }

  // Use the appropriate AST context for field retrieval
  // When in a subquery, use the subquery's AST to get only its fields
  const astForFields = astContext.astForContext;

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
    const secondToLastCharacter = innerText[innerText.length - 2];
    const variableType =
      secondToLastCharacter === ESQL_VARIABLES_PREFIX
        ? ESQLVariableType.FIELDS
        : ESQLVariableType.VALUES;
    controlSuggestions = getControlSuggestionIfSupported(
      Boolean(supportsControls),
      variableType,
      ControlTriggerSource.QUESTION_MARK,
      getVariables?.(),
      false
    );

    return orderingEngine.sort(controlSuggestions, { command: '' });
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

  const headers = commands.filter((cmd) => isHeaderCommand(cmd));
  const unmappedFieldsStrategy = getUnmappedFieldsStrategy(headers);

  // Get the context that might be needed by the command itself
  const additionalCommandContext = await getCommandContext(
    astContext.command,
    innerText,
    callbacks
  );

  const isInsideSubquery = astContext.isCursorInSubquery; // We only show resource browser suggestions in the main query
  const isResourceBrowserEnabled = (await callbacks?.isResourceBrowserEnabled?.()) ?? false;

  const context = {
    ...references,
    ...additionalCommandContext,
    activeProduct: callbacks?.getActiveProduct?.(),
    isCursorInSubquery: astContext.isCursorInSubquery,
    isFieldsBrowserEnabled: isResourceBrowserEnabled && !isInsideSubquery,
    unmappedFieldsStrategy,
  };

  // Wrap getColumnsByType so the fields browser option is injected from context;
  // command autocompletes and getFieldsSuggestions stay agnostic.
  const getByTypeWithContext: GetColumnsByTypeFn = (type, ignored, options) =>
    getColumnsByType(type, ignored, {
      ...options,
      isFieldsBrowserEnabled: context.isFieldsBrowserEnabled,
    });

  // does it make sense to have a different context per command?
  const suggestions = await commandDefinition.methods.autocomplete(
    fullText,
    astContext.command,
    {
      getByType: getByTypeWithContext,
      getSuggestedUserDefinedColumnName,
      getColumnsForQuery: callbacks?.getColumnsFor
        ? async (query: string) => {
            return await callbacks.getColumnsFor!({ query });
          }
        : undefined,
      hasMinimumLicenseRequired,
      getKqlSuggestions: callbacks?.getKqlSuggestions,
      canCreateLookupIndex: callbacks?.canCreateLookupIndex,
      isServerless: callbacks?.isServerless,
    },
    context,
    offset
  );

  const commandName = astContext.command.name.toLowerCase();
  const isTSorFROMCommand = commandName === 'from' || commandName === 'ts';

  if (isTSorFROMCommand && isResourceBrowserEnabled && !isInsideSubquery) {
    const { rangeToReplace, filterText } =
      suggestions.find((s) => s.rangeToReplace && s.filterText) ?? {};
    const insertText = rangeToReplace
      ? fullText.substring(rangeToReplace.start, rangeToReplace.end - 1) // end is exclusive
      : '';
    const commandArgs = buildResourceBrowserCommandArgs({
      sources: context.sources,
      timeSeriesSources: context.timeSeriesSources,
    });
    suggestions.unshift(
      createIndicesBrowserSuggestion(rangeToReplace, filterText, insertText, commandArgs)
    );
  }

  // Apply context-aware ordering
  const orderedSuggestions = orderingEngine.sort(suggestions, {
    command: astContext.command.name.toUpperCase(),
    location: astContext.option?.name.toUpperCase(),
  });

  return orderedSuggestions;
}
