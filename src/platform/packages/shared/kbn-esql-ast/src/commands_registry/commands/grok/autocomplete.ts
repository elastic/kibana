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
import type { ESQLCommand } from '../../../types';
import { pipeCompleteItem } from '../../complete_items';
import type { ICommandCallbacks } from '../../types';
import { type ISuggestionItem, type ICommandContext } from '../../types';
import { buildConstantsDefinitions } from '../../../definitions/utils/literals';
import { ESQL_STRING_TYPES } from '../../../definitions/types';
import { getInsideFunctionsSuggestions } from '../../../definitions/utils/autocomplete/functions';

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);
  const commandArgs = command.args.filter((arg) => !Array.isArray(arg) && arg.type !== 'unknown');

  const functionsSpecificSuggestions = await getInsideFunctionsSuggestions(
    innerText,
    cursorPosition,
    callbacks,
    context
  );
  if (functionsSpecificSuggestions) {
    return functionsSpecificSuggestions;
  }

  // GROK field /
  if (commandArgs.length === 1 && /\s$/.test(innerText)) {
    return buildConstantsDefinitions(
      ['"%{WORD:firstWord}"'],
      i18n.translate('kbn-esql-ast.esql.autocomplete.aPatternString', {
        defaultMessage: 'A pattern string',
      }),
      undefined,
      {
        advanceCursorAndOpenSuggestions: true,
      }
    );
  }
  // GROK field pattern /
  else if (commandArgs.length === 2) {
    return [withAutoSuggest(pipeCompleteItem)];
  }

  // GROK /
  const fieldSuggestions = (await callbacks?.getByType?.(ESQL_STRING_TYPES)) || [];
  return fieldSuggestions.map((sug) => {
    return withAutoSuggest({
      ...sug,
      text: `${sug.text} `,
    });
  });
}
