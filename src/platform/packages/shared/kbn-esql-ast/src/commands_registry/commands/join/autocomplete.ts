/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { withAutoSuggest } from '../../../definitions/utils/autocomplete/helpers';
import {
  getLookupIndexCreateSuggestion,
  handleFragment,
} from '../../../definitions/utils/autocomplete/helpers';
import type { ESQLAstAllCommands, ESQLAstJoinCommand } from '../../../types';
import type { ESQLFieldWithMetadata, ICommandCallbacks } from '../../types';
import { type ISuggestionItem, type ICommandContext, Location } from '../../types';
import { pipeCompleteItem, commaCompleteItem } from '../../complete_items';
import {
  createEnrichedContext,
  createEnrichedGetByType,
  getFullCommandMnemonics,
  getPosition,
  isCommonField,
} from './utils';
import { specialIndicesToSuggestions } from '../../../definitions/utils/sources';
import { esqlCommandRegistry } from '../..';
import { suggestForExpression } from '../../../definitions/utils';
import { isFunctionExpression } from '../../../ast/is';
import { within } from '../../../ast/location';
import { getExpressionType, isExpressionComplete } from '../../../definitions/utils/expressions';

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
          sortText: `${i}-MNEMONIC`,
        })
      );
    }

    case 'after_mnemonic':
    case 'index': {
      const indexNameInput = commandText.split(' ').pop() ?? '';
      const joinSources = context?.joinSources;
      const suggestions: ISuggestionItem[] = [];

      const canCreate = (await callbacks?.canCreateLookupIndex?.(indexNameInput)) ?? false;

      const indexAlreadyExists = joinSources?.some(
        (source) => source.name === indexNameInput || source.aliases.includes(indexNameInput)
      );
      if (canCreate && !indexAlreadyExists) {
        const createIndexCommandSuggestion = getLookupIndexCreateSuggestion(
          innerText,
          indexNameInput
        );
        suggestions.push(createIndexCommandSuggestion);
      }

      if (joinSources?.length) {
        const joinIndexesSuggestions = specialIndicesToSuggestions(joinSources);
        suggestions.push(
          ...(await handleFragment(
            innerText,
            (fragment) =>
              specialIndicesToSuggestions(joinSources).some(
                ({ label }) => label.toLocaleLowerCase() === fragment.toLocaleLowerCase()
              ),
            (_fragment, rangeToReplace?: { start: number; end: number }) =>
              joinIndexesSuggestions.map((suggestion) => ({ ...suggestion, rangeToReplace })),
            () => []
          ))
        );
      }

      return suggestions;
    }

    case 'after_index': {
      const suggestion: ISuggestionItem = withAutoSuggest({
        label: 'ON',
        text: 'ON ',
        detail: i18n.translate('kbn-esql-ast.esql.autocomplete.join.onKeyword', {
          defaultMessage: 'Specify JOIN field conditions',
        }),
        kind: 'Keyword',
        sortText: '0-ON',
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

      const suggestions = await suggestForExpression({
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

      const insideFunction =
        expressionRoot &&
        isFunctionExpression(expressionRoot) &&
        within(cursorPosition, expressionRoot);

      if (expressionRoot && !insideFunction) {
        const expressionType = getExpressionType(expressionRoot, enrichedContext?.columns);
        const isBooleanComplete =
          expressionType === 'boolean' && isExpressionComplete(expressionType, innerText);

        // Special case: single common field (exists in both source and lookup) is valid as shorthand for field = field
        const fieldIsCommon =
          expressionRoot.type === 'column' && isCommonField(expressionRoot.name, context);

        if (isBooleanComplete || (!isBooleanComplete && fieldIsCommon)) {
          filteredSuggestions.push(withAutoSuggest({ ...commaCompleteItem, text: ', ' }));
          filteredSuggestions.push(pipeCompleteItem);
        }
      }

      return filteredSuggestions;
    }
  }

  const suggestions: ISuggestionItem[] = [];

  return suggestions;
}
