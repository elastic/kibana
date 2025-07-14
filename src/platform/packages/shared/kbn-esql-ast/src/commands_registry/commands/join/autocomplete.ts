/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { getLookupIndexCreateSuggestion } from '../../../definitions/utils/functions';
import type { ESQLCommand } from '../../../types';
import { type ISuggestionItem, type ICommandContext, ICommandCallbacks } from '../../types';
import { TRIGGER_SUGGESTION_COMMAND } from '../../constants';
import { pipeCompleteItem, commaCompleteItem } from '../../complete_items';
import { getFullCommandMnemonics, getPosition, suggestFields } from './utils';
import { specialIndicesToSuggestions } from '../../../definitions/utils/sources';
import { esqlCommandRegistry } from '../..';

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
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

      return filteredMnemonics.map(
        ([mnemonic, description], i) =>
          ({
            label: mnemonic,
            text: mnemonic + ' $0',
            detail: description,
            kind: 'Keyword',
            sortText: `${i}-MNEMONIC`,
            command: TRIGGER_SUGGESTION_COMMAND,
          } as ISuggestionItem)
      );
    }

    case 'after_mnemonic':
    case 'index': {
      const indexNameInput = commandText.split(' ').pop() ?? '';

      const isCreateCommandEnabled = (await callbacks?.getCurrentAppId?.()) === 'discover';

      const joinSources = context?.joinSources;

      const suggestions: ISuggestionItem[] = [];

      if (isCreateCommandEnabled) {
        const createIndexCommandSuggestion = getLookupIndexCreateSuggestion(indexNameInput);
        suggestions.push(createIndexCommandSuggestion);
      }

      if (joinSources?.length) {
        suggestions.push(...specialIndicesToSuggestions(joinSources));
      }

      return suggestions;
    }

    case 'after_index': {
      const suggestion: ISuggestionItem = {
        label: 'ON',
        text: 'ON ',
        detail: i18n.translate('kbn-esql-ast.esql.autocomplete.join.onKeyword', {
          defaultMessage: 'Specify JOIN field conditions',
        }),
        kind: 'Keyword',
        sortText: '0-ON',
        command: TRIGGER_SUGGESTION_COMMAND,
      };

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
      if (/(?<!\,)\s+$/.test(innerText)) {
        // this trailing whitespace was not proceeded by a comma
        return [commaCompleteItem, pipeCompleteItem];
      }

      const fields = await suggestFields(
        innerText,
        command,
        callbacks?.getByType,
        callbacks?.getColumnsForQuery,
        context
      );

      return fields;
    }
  }

  const suggestions: ISuggestionItem[] = [];

  return suggestions;
}
