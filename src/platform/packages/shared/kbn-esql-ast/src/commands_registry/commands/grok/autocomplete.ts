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
import type { ESQLAstAllCommands } from '../../../types';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';
import type { ICommandCallbacks } from '../../types';
import type { ISuggestionItem, ICommandContext } from '../../types';
import { buildConstantsDefinitions } from '../../../definitions/utils/literals';
import { ESQL_STRING_TYPES } from '../../../definitions/types';
import { Parser } from '../../../parser';
import { correctQuerySyntax, findAstPosition } from '../../../definitions/utils/ast';

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition: number = query.length
): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);
  const commandArgs = command.args.filter((arg) => !Array.isArray(arg) && arg.type !== 'unknown');

  // If cursor is inside a string literal, don't suggest anything
  const correctedQuery = correctQuerySyntax(innerText);
  const { root } = Parser.parse(correctedQuery, { withFormatting: true });
  const { node } = findAstPosition(root.commands, innerText.length);

  if (node?.type === 'literal' && node.literalType === 'keyword') {
    return [];
  }

  const hasField = commandArgs.length >= 1;
  const hasPatterns = commandArgs.length >= 2;
  const endsWithSpace = /\s$/.test(innerText);
  const endsWithComma = /,\s*$/.test(innerText);

  // No field yet OR still typing field name (no patterns and no trailing space) - suggest field names
  if (!hasField || (hasField && !hasPatterns && !endsWithSpace)) {
    const fieldSuggestions = (await callbacks?.getByType?.(ESQL_STRING_TYPES)) || [];

    return fieldSuggestions.map((suggestion) => ({
      ...withAutoSuggest(suggestion),
      text: `${suggestion.text} `,
    }));
  }

  if (hasField && !hasPatterns && endsWithSpace) {
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

  if (endsWithComma) {
    return buildConstantsDefinitions(
      ['"%{WORD:nextWord}"'],
      i18n.translate('kbn-esql-ast.esql.autocomplete.aPatternString', {
        defaultMessage: 'A pattern string',
      }),
      undefined,
      {
        advanceCursorAndOpenSuggestions: true,
      }
    );
  }

  // Has at least one pattern - suggest pipe or comma for more patterns
  if (hasPatterns) {
    return [
      withAutoSuggest(pipeCompleteItem),
      withAutoSuggest({ ...commaCompleteItem, text: ', ' }),
    ];
  }

  return [];
}
