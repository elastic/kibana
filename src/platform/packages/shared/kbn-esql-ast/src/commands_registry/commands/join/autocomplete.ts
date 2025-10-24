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
import type {
  ESQLAstAllCommands,
  ESQLAstJoinCommand,
  ESQLCommandOption,
  ESQLSingleAstItem,
} from '../../../types';
import type { ICommandCallbacks } from '../../types';
import { type ISuggestionItem, type ICommandContext, Location } from '../../types';
import { pipeCompleteItem, commaCompleteItem } from '../../complete_items';
import { getFullCommandMnemonics, getPosition, suggestFields } from './utils';
import { specialIndicesToSuggestions } from '../../../definitions/utils/sources';
import { esqlCommandRegistry } from '../..';
import { suggestForExpression } from '../../../definitions/utils';
import { isFunctionExpression, isOptionNode } from '../../../ast/is';
import { within } from '../../../ast/location';
import { logicalOperators, operatorsDefinitions } from '../../../definitions/all_operators';

const asOperator = operatorsDefinitions.find((op) => op.name === 'as')!;

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

  const position = getPosition(commandText);

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

    case 'after_on': {
      return await suggestFields(
        innerText,
        command,
        callbacks?.getByType,
        callbacks?.getColumnsForQuery,
        context
      );
    }

    case 'condition': {
      const joinCommand = command as ESQLAstJoinCommand;
      const onOption = joinCommand.args?.find((arg) => isOptionNode(arg) && arg.name === 'on') as
        | ESQLCommandOption
        | undefined;

      let expressionRoot = onOption?.args?.[onOption.args.length - 1] as
        | ESQLSingleAstItem
        | undefined;

      const textBeforeCursor = innerText.slice(0, cursorPosition);
      const afterLastComma = textBeforeCursor.split(',').pop() || '';
      const isAfterComma = textBeforeCursor.includes(',') && afterLastComma.trim() === '';

      // After a comma, we start a new expression. Without reset, suggestForExpression would think
      // we're still inside the previous expression and suggest AND/OR instead of fields/functions
      if (isAfterComma) {
        expressionRoot = undefined;
      }

      const suggestions = await suggestForExpression({
        query,
        expressionRoot,
        command,
        cursorPosition,
        location: Location.JOIN,
        context,
        callbacks,
        options: {
          preferredExpressionType: 'boolean',
        },
      });

      // Filter out AS operator - it's not valid in boolean expressions
      const filteredSuggestions = suggestions.filter(
        ({ label }) => label !== asOperator.name.toUpperCase()
      );

      const insideFunction =
        expressionRoot &&
        isFunctionExpression(expressionRoot) &&
        within(cursorPosition, expressionRoot);

      const logicalOperatorNames = logicalOperators.map(({ name }) => name.toUpperCase());
      const hasLogicalOperators = filteredSuggestions.some(({ label }) =>
        logicalOperatorNames.includes(label)
      );

      if (hasLogicalOperators && !insideFunction) {
        filteredSuggestions.push(commaCompleteItem);
        filteredSuggestions.push(pipeCompleteItem);
      }

      return filteredSuggestions;
    }
  }

  const suggestions: ISuggestionItem[] = [];

  return suggestions;
}
