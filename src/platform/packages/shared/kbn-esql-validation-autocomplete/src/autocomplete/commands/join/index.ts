/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ESQLCommand, mutate, LeafPrinter } from '@kbn/esql-ast';
import type { ESQLAstJoinCommand } from '@kbn/esql-ast';
import type { ESQLCallbacks } from '../../../shared/types';
import {
  CommandBaseDefinition,
  CommandDefinition,
  CommandSuggestParams,
  CommandTypeDefinition,
} from '../../../definitions/types';
import {
  getPosition,
  joinIndicesToSuggestions,
  suggestionIntersection,
  suggestionUnion,
} from './util';
import { TRIGGER_SUGGESTION_COMMAND, buildFieldsDefinitionsWithMetadata } from '../../factories';
import type { GetColumnsByTypeFn, SuggestionRawDefinition } from '../../types';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';

const getFullCommandMnemonics = (
  definition: CommandDefinition<string>
): Array<[mnemonic: string, description: string]> => {
  const types: CommandTypeDefinition[] = definition.types ?? [];

  if (!types.length) {
    return [[definition.name, definition.description]];
  }

  return types.map((type) => [
    `${type.name.toUpperCase()} ${definition.name.toUpperCase()}`,
    type.description ?? definition.description,
  ]);
};

const suggestFields = async (
  command: ESQLCommand<'join'>,
  getColumnsByType: GetColumnsByTypeFn,
  callbacks?: ESQLCallbacks
) => {
  const summary = mutate.commands.join.summarizeCommand(command as ESQLAstJoinCommand);
  const joinIndexPattern = LeafPrinter.print(summary.target.index);

  const [lookupIndexFields, sourceFields] = await Promise.all([
    callbacks?.getColumnsFor?.({ query: `FROM ${joinIndexPattern}` }),
    getColumnsByType(['any'], [], {
      advanceCursor: true,
      openSuggestions: true,
    }),
  ]);

  const supportsControls = callbacks?.canSuggestVariables?.() ?? false;
  const getVariablesByType = callbacks?.getVariablesByType;
  const joinFields = buildFieldsDefinitionsWithMetadata(
    lookupIndexFields!,
    { supportsControls },
    getVariablesByType
  );

  const intersection = suggestionIntersection(joinFields, sourceFields);
  const union = suggestionUnion(sourceFields, joinFields);

  for (const commonField of intersection) {
    commonField.sortText = '1';
    commonField.documentation = {
      value: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.join.sharedField', {
        defaultMessage: 'Field shared between the source and the lookup index',
      }),
    };

    let detail = commonField.detail || '';

    if (detail) {
      detail += ' ';
    }

    detail += i18n.translate(
      'kbn-esql-validation-autocomplete.esql.autocomplete.join.commonFieldNote',
      {
        defaultMessage: '(common field)',
      }
    );

    commonField.detail = detail;
  }

  return [...intersection, ...union];
};

export const suggest: CommandBaseDefinition<'join'>['suggest'] = async ({
  innerText,
  command,
  getColumnsByType,
  definition,
  callbacks,
  previousCommands,
}: CommandSuggestParams<'join'>): Promise<SuggestionRawDefinition[]> => {
  let commandText: string = innerText;

  if (command.location) {
    commandText = innerText.slice(command.location.min);
  }

  const position = getPosition(commandText, command);

  switch (position.pos) {
    case 'type':
    case 'after_type':
    case 'mnemonic': {
      const allMnemonics = getFullCommandMnemonics(definition! as CommandDefinition<string>);
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
          } as SuggestionRawDefinition)
      );
    }

    case 'after_mnemonic':
    case 'index': {
      const joinIndices = await callbacks?.getJoinIndices?.();

      if (!joinIndices) {
        return [];
      }

      return joinIndicesToSuggestions(joinIndices.indices);
    }

    case 'after_index': {
      const suggestion: SuggestionRawDefinition = {
        label: 'ON',
        text: 'ON ',
        detail: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.autocomplete.join.onKeyword',
          {
            defaultMessage: 'Specify JOIN field conditions',
          }
        ),
        kind: 'Keyword',
        sortText: '0-ON',
        command: TRIGGER_SUGGESTION_COMMAND,
      };

      return [suggestion];
    }

    case 'after_on': {
      const fields = await suggestFields(command, getColumnsByType, callbacks);

      return fields;
    }

    case 'condition': {
      const endingWhitespaceRegex = /(?<comma>,)?(?<whitespace>\s{0,99})$/;
      const match = commandText.match(endingWhitespaceRegex);
      const commaIsLastToken = !!match?.groups?.comma;

      if (commaIsLastToken) {
        const fields = await suggestFields(command, getColumnsByType, callbacks);

        return fields;
      }

      return [pipeCompleteItem, commaCompleteItem];
    }
  }

  const suggestions: SuggestionRawDefinition[] = [];

  return suggestions;
};
