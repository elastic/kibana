/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { EDITOR_MARKER } from '../../../shared/constants';
import { isSingleItem } from '../../../..';
import { ESQL_STRING_TYPES } from '../../../shared/esql_types';
import { CommandSuggestParams } from '../../../definitions/types';

import type { SuggestionRawDefinition } from '../../types';
import { TRIGGER_SUGGESTION_COMMAND, buildConstantsDefinitions } from '../../factories';
import { colonCompleteItem, pipeCompleteItem, semiColonCompleteItem } from '../../complete_items';

export async function suggest({
  command,
  innerText,
  getColumnsByType,
}: CommandSuggestParams<'dissect'>): Promise<SuggestionRawDefinition[]> {
  const commandArgs = command.args.filter(
    (arg) => isSingleItem(arg) && arg.text !== EDITOR_MARKER && arg.text !== ''
  );

  // DISSECT field /
  if (commandArgs.length === 1) {
    return buildConstantsDefinitions(
      ['"%{firstWord}"'],
      i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.aPatternString', {
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
  else if (/append_separator\s*=\s*$/i.test(innerText)) {
    return [colonCompleteItem, semiColonCompleteItem];
  }
  // DISSECT field APPEND_SEPARATOR = ":" /
  else if (commandArgs.some((arg) => isSingleItem(arg) && arg.type === 'option')) {
    return [{ ...pipeCompleteItem, command: TRIGGER_SUGGESTION_COMMAND }];
  }

  // DISSECT /
  const fieldSuggestions = await getColumnsByType(ESQL_STRING_TYPES);
  return fieldSuggestions.map((sug) => ({
    ...sug,
    text: `${sug.text} `,
    command: TRIGGER_SUGGESTION_COMMAND,
  }));
}

const appendSeparatorCompletionItem: SuggestionRawDefinition = {
  command: TRIGGER_SUGGESTION_COMMAND,
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.appendSeparatorDoc', {
    defaultMessage:
      'The character(s) that separate the appended fields. Default to empty string ("").',
  }),
  kind: 'Reference',
  label: 'APPEND_SEPARATOR',
  sortText: '1',
  text: 'APPEND_SEPARATOR = ',
};
