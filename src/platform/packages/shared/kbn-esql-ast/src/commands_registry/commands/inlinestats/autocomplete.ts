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
import type { ISuggestionItem, ICommandCallbacks, ICommandContext } from '../../types';
import { getPosition } from './utils';
import { autocomplete as statsAutocomplete } from '../stats/autocomplete';
import { TRIGGER_SUGGESTION_COMMAND } from '../../constants';

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

  const { position, isTyping } = getPosition(query, command);

  // Handle multi-token recognition for "INLINE STATS"
  switch (position) {
    case 'type':
      if (isTyping) {
        return [
          {
            label: 'INLINE STATS',
            text: 'INLINE STATS ',
            kind: 'Keyword',
            detail: i18n.translate('kbn-esql-ast.esql.autocomplete.inlineStats.commandSuggestion', {
              defaultMessage: 'INLINE STATS command',
            }),
            sortText: 'A',
            command: TRIGGER_SUGGESTION_COMMAND,
          },
        ];
      }

      return [];

    case 'after_type':
    case 'mnemonic':
      if (isTyping) {
        return [
          {
            label: 'STATS',
            text: 'STATS ',
            kind: 'Keyword',
            detail: i18n.translate('kbn-esql-ast.esql.autocomplete.inlineStats.statsKeyword', {
              defaultMessage: 'STATS keyword',
            }),
            sortText: 'A',
            command: TRIGGER_SUGGESTION_COMMAND,
          },
        ];
      }

      return [];

    default:
      return statsAutocomplete(query, command, callbacks, context, cursorPosition);
  }
}
