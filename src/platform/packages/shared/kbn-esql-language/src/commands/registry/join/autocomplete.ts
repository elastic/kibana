/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import type { ESQLAstAllCommands, ESQLAstJoinCommand } from '@elastic/esql/types';
import {
  getLookupIndexCreateSuggestion,
  withAutoSuggest,
} from '../../definitions/utils/autocomplete/helpers';
import type { ICommandCallbacks } from '../types';
import { type ISuggestionItem, type ICommandContext, Location } from '../types';
import { newLineAndPipeCompleteItems, commaCompleteItem } from '../complete_items';
import {
  createEnrichedContext,
  createEnrichedGetByType,
  getFullCommandMnemonics,
  getPosition,
  isCommonField,
} from './utils';
import { specialIndicesToSuggestions } from '../../definitions/utils/sources';
import { esqlCommandRegistry } from '..';
import { suggestForExpression } from '../../definitions/utils';
import { COORDINATOR_LOOKUP_JOIN_PREFIX } from '../../definitions/constants';

const coordinatorPrefixSuggestion = withAutoSuggest({
  label: COORDINATOR_LOOKUP_JOIN_PREFIX,
  text: `${COORDINATOR_LOOKUP_JOIN_PREFIX}:$0`,
  asSnippet: true,
  kind: 'Reference',
  detail: i18n.translate('kbn-esql-language.esql.autocomplete.join.coordinatorPrefix', {
    defaultMessage: 'Lookup index on the coordinating cluster',
  }),
});

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition: number = query.length
): Promise<ISuggestionItem[]> {
  if (!callbacks?.getByType || !callbacks?.getColumnsForQuery) {
    return [];
  }
  const innerText = query.substring(0, cursorPosition);
  let commandText: string = innerText;

  if (command.location) {
    commandText = innerText.slice(command.location.min);
  }

  const position = getPosition(commandText, command, cursorPosition);

  switch (position.pos) {
    case 'type':
    case 'after_type':
    case 'mnemonic': {
      const joinCommandDefinition = esqlCommandRegistry.getCommandByName('join');
      const allMnemonics = getFullCommandMnemonics(joinCommandDefinition!);
      const filteredMnemonics = allMnemonics.filter(([mnemonic]) =>
        mnemonic.startsWith(commandText.toUpperCase())
      );

      if (!filteredMnemonics.length) {
        return [];
      }

      return filteredMnemonics.map(([mnemonic, description], i) =>
        withAutoSuggest({
          label: mnemonic,
          text: mnemonic + ' $0',
          asSnippet: true,
          detail: description,
          kind: 'Keyword',
        })
      );
    }

    case 'after_mnemonic':
    case 'index': {
      const words = commandText.split(/\s+/);
      const joinTargetInput = words[words.length - 1] ?? '';
      const coordinatorPrefix = `${COORDINATOR_LOOKUP_JOIN_PREFIX}:`;
      const isLookupJoin = (command as ESQLAstJoinCommand).commandType === 'lookup';
      const canSuggestCoordinatorTarget =
        isLookupJoin && Boolean(context?.hasRemoteIndexSource);
      const isCoordinatorTarget =
        canSuggestCoordinatorTarget && joinTargetInput.startsWith(coordinatorPrefix);

      if (isLookupJoin && joinTargetInput.startsWith('_') && !isCoordinatorTarget) {
        if (
          canSuggestCoordinatorTarget &&
          COORDINATOR_LOOKUP_JOIN_PREFIX.startsWith(joinTargetInput)
        ) {
          return [coordinatorPrefixSuggestion];
        }

        return [];
      }

      const indexNameInput = isCoordinatorTarget
        ? joinTargetInput.slice(coordinatorPrefix.length)
        : joinTargetInput;
      const joinSources =
        (isCoordinatorTarget ? context?.coordinatorJoinSources : context?.joinSources) ?? [];
      const suggestions: ISuggestionItem[] = [];

      const normalizedIndexNameInput = indexNameInput.toLocaleLowerCase();
      const matchesInput = (existingName: string) =>
        existingName.toLocaleLowerCase() === normalizedIndexNameInput;
      const matchesExistingIndex =
        indexNameInput.length > 0 &&
        joinSources.some(({ name, aliases }) => matchesInput(name) || aliases.some(matchesInput));

      if (canSuggestCoordinatorTarget && !joinTargetInput) {
        suggestions.push(coordinatorPrefixSuggestion);
      }

      const canSuggestCreate =
        !matchesExistingIndex && (!isCoordinatorTarget || indexNameInput.length > 0);

      if (canSuggestCreate) {
        const canCreate = (await callbacks?.canCreateLookupIndex?.(indexNameInput)) ?? false;

        if (canCreate) {
          const sourceName = isCoordinatorTarget ? joinTargetInput : undefined;
          suggestions.push(getLookupIndexCreateSuggestion(indexNameInput, sourceName));
        }
      }

      if (!matchesExistingIndex) {
        suggestions.push(...specialIndicesToSuggestions(joinSources));
      }

      return suggestions;
    }

    case 'after_index': {
      const suggestion: ISuggestionItem = withAutoSuggest({
        label: 'ON',
        text: 'ON ',
        detail: i18n.translate('kbn-esql-language.esql.autocomplete.join.onKeyword', {
          defaultMessage: 'Specify JOIN field conditions',
        }),
        kind: 'Keyword',
      });

      return [suggestion];
    }

    case 'on_expression': {
      const joinCommand = command as ESQLAstJoinCommand;
      const expressionRoot = position.expression;

      // Create enriched getByType that includes lookup fields
      const enrichedGetByType = await createEnrichedGetByType(
        callbacks?.getByType ?? (() => Promise.resolve([])),
        joinCommand,
        (callbacks?.getColumnsForQuery ?? (() => Promise.resolve([]))) as (
          query: string
        ) => Promise<ESQLFieldWithMetadata[]>,
        context
      );

      // Create enriched context that includes lookup fields in columns map
      const enrichedContext = await createEnrichedContext(
        context,
        joinCommand,
        (callbacks?.getColumnsForQuery ?? (() => Promise.resolve([]))) as (
          query: string
        ) => Promise<ESQLFieldWithMetadata[]>
      );

      const { suggestions, computed } = await suggestForExpression({
        query,
        expressionRoot,
        command,
        cursorPosition,
        location: Location.JOIN,
        context: enrichedContext,
        callbacks: {
          ...callbacks,
          getByType: enrichedGetByType,
        },
        options: {
          preferredExpressionType: 'boolean',
        },
      });

      // Filter out AS operator - it's not valid in boolean expressions
      const filteredSuggestions = suggestions.filter(({ label }) => label !== 'AS');
      const { expressionType, isComplete, insideFunction } = computed;

      if (expressionRoot && !insideFunction) {
        const isBooleanComplete = expressionType === 'boolean' && isComplete;

        // Special case: single common field (exists in both source and lookup) is valid as shorthand for field = field
        const fieldIsCommon =
          expressionRoot.type === 'column' && isCommonField(expressionRoot.name, context);

        if (isBooleanComplete || (!isBooleanComplete && fieldIsCommon)) {
          filteredSuggestions.push(withAutoSuggest({ ...commaCompleteItem, text: ', ' }));
          filteredSuggestions.push(...newLineAndPipeCompleteItems);
        }
      }

      return filteredSuggestions;
    }
  }

  const suggestions: ISuggestionItem[] = [];

  return suggestions;
}
