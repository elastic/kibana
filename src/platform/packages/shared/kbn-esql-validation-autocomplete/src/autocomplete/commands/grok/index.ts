/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { CommandSuggestParams } from '../../../definitions/types';

import type { SuggestionRawDefinition } from '../../types';
import { ESQL_STRING_TYPES } from '../../../shared/esql_types';
import { TRIGGER_SUGGESTION_COMMAND, buildConstantsDefinitions } from '../../factories';
import { pipeCompleteItem } from '../../complete_items';

export async function suggest({
  command,
  getColumnsByType,
}: CommandSuggestParams<'grok'>): Promise<SuggestionRawDefinition[]> {
  // GROK field /
  if (command.args.length === 1) {
    return buildConstantsDefinitions(
      ['"%{WORD:firstWord}"'],
      i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.aPatternString', {
        defaultMessage: 'A pattern string',
      }),
      undefined,
      {
        advanceCursorAndOpenSuggestions: true,
      }
    );
  }
  // GROK field pattern /
  else if (command.args.length === 2) {
    return [{ ...pipeCompleteItem, command: TRIGGER_SUGGESTION_COMMAND }];
  }

  // GROK /
  const fieldSuggestions = await getColumnsByType(ESQL_STRING_TYPES);
  return fieldSuggestions.map((sug) => ({
    ...sug,
    text: `${sug.text} `,
    command: TRIGGER_SUGGESTION_COMMAND,
  }));
}
