/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommand } from '@kbn/esql-ast';
import { noCaseCompare } from '../../../shared/helpers';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';
import { TRIGGER_SUGGESTION_COMMAND } from '../../factories';
import { getFieldsOrFunctionsSuggestions, handleFragment, pushItUpInTheList } from '../../helper';
import type { GetColumnsByTypeFn, SuggestionRawDefinition } from '../../types';
import { getSortPos, sortModifierSuggestions } from './helper';

export async function suggest(
  innerText: string,
  _command: ESQLCommand<'sort'>,
  getColumnsByType: GetColumnsByTypeFn,
  columnExists: (column: string) => boolean
): Promise<SuggestionRawDefinition[]> {
  const prependSpace = (s: SuggestionRawDefinition) => ({ ...s, text: ' ' + s.text });

  const { pos } = getSortPos(innerText);

  switch (pos) {
    case 'space2': {
      return [
        sortModifierSuggestions.ASC,
        sortModifierSuggestions.DESC,
        sortModifierSuggestions.NULLS_FIRST,
        sortModifierSuggestions.NULLS_LAST,
        pipeCompleteItem,
        { ...commaCompleteItem, text: ', ', command: TRIGGER_SUGGESTION_COMMAND },
      ];
    }
    case 'order': {
      return handleFragment(
        innerText,
        (fragment) => ['ASC', 'DESC'].some((completeWord) => noCaseCompare(completeWord, fragment)),
        (_fragment) => {
          return Object.values(sortModifierSuggestions);
        },
        (fragment) => {
          return [
            { ...pipeCompleteItem, text: ' | ' },
            { ...commaCompleteItem, text: ', ' },
            prependSpace(sortModifierSuggestions.NULLS_FIRST),
            prependSpace(sortModifierSuggestions.NULLS_LAST),
          ].map((suggestion) => ({
            ...suggestion,
            filterText: fragment,
            text: fragment + suggestion.text,
            command: TRIGGER_SUGGESTION_COMMAND,
          }));
        }
      );
    }
    case 'space3': {
      return [
        sortModifierSuggestions.NULLS_FIRST,
        sortModifierSuggestions.NULLS_LAST,
        pipeCompleteItem,
        { ...commaCompleteItem, text: ', ', command: TRIGGER_SUGGESTION_COMMAND },
      ];
    }
    case 'nulls': {
      return handleFragment(
        innerText,
        (fragment) =>
          ['FIRST', 'LAST'].some((completeWord) => noCaseCompare(completeWord, fragment)),
        (_fragment) => Object.values(sortModifierSuggestions).map((s) => ({ ...s })),
        (fragment) => {
          return [
            { ...pipeCompleteItem, text: ' | ' },
            { ...commaCompleteItem, text: ', ' },
          ].map((suggestion) => ({
            ...suggestion,
            filterText: fragment,
            text: fragment + suggestion.text,
            command: TRIGGER_SUGGESTION_COMMAND,
          }));
        }
      );
    }
    case 'space4': {
      return [
        pipeCompleteItem,
        { ...commaCompleteItem, text: ', ', command: TRIGGER_SUGGESTION_COMMAND },
      ];
    }
  }

  const fieldSuggestions = await getColumnsByType('any', [], {
    openSuggestions: true,
  });
  const functionSuggestions = await getFieldsOrFunctionsSuggestions(
    ['any'],
    'sort',
    undefined,
    getColumnsByType,
    {
      functions: true,
      fields: false,
    }
  );

  return await handleFragment(
    innerText,
    columnExists,
    (_fragment: string) => {
      // SORT fie<suggest>
      return [
        ...pushItUpInTheList(
          fieldSuggestions.map((suggestion) => {
            // if there is already a command, we don't want to override it
            if (suggestion.command) return suggestion;
            return {
              ...suggestion,
              command: TRIGGER_SUGGESTION_COMMAND,
            };
          }),
          true
        ),
        ...functionSuggestions,
      ];
    },
    (fragment: string) => {
      // SORT field<suggest>
      return [
        { ...pipeCompleteItem, text: ' | ' },
        { ...commaCompleteItem, text: ', ' },
        prependSpace(sortModifierSuggestions.ASC),
        prependSpace(sortModifierSuggestions.DESC),
        prependSpace(sortModifierSuggestions.NULLS_FIRST),
        prependSpace(sortModifierSuggestions.NULLS_LAST),
      ].map<SuggestionRawDefinition>((s) => ({
        ...s,
        filterText: fragment,
        text: fragment + s.text,
        command: TRIGGER_SUGGESTION_COMMAND,
      }));
    }
  );
}
