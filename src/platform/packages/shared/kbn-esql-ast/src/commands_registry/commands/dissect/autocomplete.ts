/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLCommand } from '../../../types';
import { ICommandCallbacks } from '../../types';
import { pipeCompleteItem, colonCompleteItem, semiColonCompleteItem } from '../../complete_items';
import { type ISuggestionItem, type ICommandContext } from '../../types';
import { TRIGGER_SUGGESTION_COMMAND } from '../../constants';
import { buildConstantsDefinitions } from '../../../definitions/utils/literals';
import { ESQL_STRING_TYPES } from '../../../definitions/types';

const appendSeparatorCompletionItem: ISuggestionItem = {
  command: TRIGGER_SUGGESTION_COMMAND,
  detail: i18n.translate('kbn-esql-ast.esql.definitions.appendSeparatorDoc', {
    defaultMessage:
      'The character(s) that separate the appended fields. Default to empty string ("").',
  }),
  kind: 'Reference',
  label: 'APPEND_SEPARATOR',
  sortText: '1',
  text: 'APPEND_SEPARATOR = ',
};

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext
): Promise<ISuggestionItem[]> {
  const commandArgs = command.args.filter((arg) => !Array.isArray(arg) && arg.type !== 'unknown');

  // DISSECT field/
  if (commandArgs.length === 1 && /\s$/.test(query)) {
    return buildConstantsDefinitions(
      ['"%{firstWord}"'],
      i18n.translate('kbn-esql-ast.esql.autocomplete.aPatternString', {
        defaultMessage: 'A pattern string',
      }),
      undefined,
      {
        advanceCursorAndOpenSuggestions: true,
      }
    );
  }
  // DISSECT field pattern /
  else if (commandArgs.length === 2) {
    return [
      { ...pipeCompleteItem, command: TRIGGER_SUGGESTION_COMMAND },
      appendSeparatorCompletionItem,
    ];
  }
  // DISSECT field APPEND_SEPARATOR = /
  else if (/append_separator\s*=\s*$/i.test(query)) {
    return [colonCompleteItem, semiColonCompleteItem];
  }
  // DISSECT field APPEND_SEPARATOR = ":" /
  else if (commandArgs.some((arg) => !Array.isArray(arg) && arg.type === 'option')) {
    return [{ ...pipeCompleteItem, command: TRIGGER_SUGGESTION_COMMAND }];
  }

  // DISSECT /
  const fieldSuggestions = (await callbacks?.getByType?.(ESQL_STRING_TYPES)) ?? [];
  return fieldSuggestions.map((sug) => ({
    ...sug,
    text: `${sug.text} `,
    command: TRIGGER_SUGGESTION_COMMAND,
  }));
}
