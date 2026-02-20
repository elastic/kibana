/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { withAutoSuggest } from '../../definitions/utils/autocomplete/helpers';
import type { ESQLAstAllCommands, ESQLCommand } from '../../../types';
import type { ICommandCallbacks } from '../types';
import { type ISuggestionItem, type ICommandContext } from '../types';
import { pipeCompleteItem, commaCompleteItem } from '../complete_items';
import {
  columnExists,
  getLastNonWhitespaceChar,
  handleFragment,
} from '../../definitions/utils/autocomplete/helpers';
import { isColumn } from '../../../ast/is';

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);
  if (
    /\s/.test(innerText[innerText.length - 1]) &&
    getLastNonWhitespaceChar(innerText) !== ',' &&
    !/keep\s+\S*$/i.test(innerText)
  ) {
    return [pipeCompleteItem, commaCompleteItem];
  }

  const alreadyDeclaredFields = (command as ESQLCommand).args
    .filter(isColumn)
    .map((arg) => arg.parts.join('.'));
  const fieldSuggestions = (await callbacks?.getByType?.('any', alreadyDeclaredFields)) ?? [];
  return handleFragment(
    innerText,
    (fragment) => columnExists(fragment, context),
    (_fragment: string, rangeToReplace?: { start: number; end: number }) => {
      // KEEP fie<suggest>
      return fieldSuggestions.map((suggestion) => {
        return withAutoSuggest({
          ...suggestion,
          text: suggestion.text,

          rangeToReplace,
        });
      });
    },
    (fragment: string, rangeToReplace: { start: number; end: number }) => {
      // KEEP field<suggest>
      const finalSuggestions = [{ ...pipeCompleteItem, text: ' | ' }];
      if (fieldSuggestions.length > 0) finalSuggestions.push({ ...commaCompleteItem, text: ', ' });

      return finalSuggestions.map<ISuggestionItem>((s) =>
        withAutoSuggest({
          ...s,
          filterText: fragment,
          text: fragment + s.text,
          rangeToReplace,
        })
      );
    }
  );
}
