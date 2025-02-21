/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CommandSuggestParams } from '../../../definitions/types';
import {
  findPreviousWord,
  getLastNonWhitespaceChar,
  isColumnItem,
  noCaseCompare,
} from '../../../shared/helpers';
import type { SuggestionRawDefinition } from '../../types';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';
import { handleFragment } from '../../helper';
import { TRIGGER_SUGGESTION_COMMAND } from '../../factories';

export async function suggest({
  innerText,
  getColumnsByType,
  command,
  columnExists,
}: CommandSuggestParams<'keep'>): Promise<SuggestionRawDefinition[]> {
  if (
    /\s/.test(innerText[innerText.length - 1]) &&
    getLastNonWhitespaceChar(innerText) !== ',' &&
    !noCaseCompare(findPreviousWord(innerText), 'keep')
  ) {
    return [pipeCompleteItem, commaCompleteItem];
  }

  const alreadyDeclaredFields = command.args.filter(isColumnItem).map((arg) => arg.name);
  const fieldSuggestions = await getColumnsByType('any', alreadyDeclaredFields);

  return handleFragment(
    innerText,
    (fragment) => columnExists(fragment),
    (_fragment: string, rangeToReplace?: { start: number; end: number }) => {
      // KEEP fie<suggest>
      return fieldSuggestions.map((suggestion) => {
        // if there is already a command, we don't want to override it
        if (suggestion.command) return suggestion;
        return {
          ...suggestion,
          text: suggestion.text,
          command: TRIGGER_SUGGESTION_COMMAND,
          rangeToReplace,
        };
      });
    },
    (fragment: string, rangeToReplace: { start: number; end: number }) => {
      // KEEP field<suggest>
      const finalSuggestions = [{ ...pipeCompleteItem, text: ' | ' }];
      if (fieldSuggestions.length > 1)
        // when we fix the editor marker, this should probably be checked against 0 instead of 1
        // this is because the last field in the AST is currently getting removed (because it contains
        // the editor marker) so it is not included in the ignored list which is used to filter out
        // existing fields above.
        finalSuggestions.push({ ...commaCompleteItem, text: ', ' });

      return finalSuggestions.map<SuggestionRawDefinition>((s) => ({
        ...s,
        filterText: fragment,
        text: fragment + s.text,
        command: TRIGGER_SUGGESTION_COMMAND,
        rangeToReplace,
      }));
    }
  );
}
