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
import { pipeCompleteItem } from '../../complete_items';
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
    const withSpace = {
      ...sug,
      text: `${sug.text} `,
    };

    return withAutoSuggest(withSpace);
  });
}
