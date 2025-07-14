/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ICommandCallbacks, Location } from '../../types';
import type { ESQLCommand } from '../../../types';
import { type ISuggestionItem, type ICommandContext } from '../../types';
import { pipeCompleteItem, commaCompleteItem } from '../../complete_items';
import {
  handleFragment,
  getFieldsOrFunctionsSuggestions,
  pushItUpInTheList,
  columnExists,
} from '../../../definitions/utils/autocomplete/helpers';
import { TRIGGER_SUGGESTION_COMMAND } from '../../constants';
import { getSortPos, sortModifierSuggestions } from './utils';

const noCaseCompare = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  if (!callbacks?.getByType) {
    return [];
  }
  const innerText = query.substring(0, cursorPosition);
  const prependSpace = (s: ISuggestionItem) => ({ ...s, text: ' ' + s.text });

  const commandText = innerText.slice(command.location.min);

  const pos = getSortPos(commandText, command);

  switch (pos) {
    case 'empty_expression': {
      return await suggestForExpression({
        ...params,
        expressionRoot: undefined,
        location: Location.SORT,
        preferredExpressionType: 'boolean',
      });
    }
    case 'expression': {
      const expressionRoot = command.args[command.args.length - 1];
      if (!expressionRoot || !isSingleItem(expressionRoot)) {
        // guaranteed by the getSortPos function, but we check it here for type safety
        return [];
      }

      const suggestions = await suggestForExpression({
        ...params,
        expressionRoot,
        location: Location.SORT,
        preferredExpressionType: 'boolean',
      });

      const sortCommandKeywordSuggestions = [
        sortModifierSuggestions.ASC,
        sortModifierSuggestions.DESC,
        sortModifierSuggestions.NULLS_FIRST,
        sortModifierSuggestions.NULLS_LAST,
        pipeCompleteItem,
        { ...commaCompleteItem, text: ', ', command: TRIGGER_SUGGESTION_COMMAND },
      ];

      if (isExpressionComplete(getExpressionType(expressionRoot), innerText)) {
        suggestions.push(...sortCommandKeywordSuggestions);
      }

      return suggestions;
    }
    case 'order_complete': {
      return handleFragment(
        innerText,
        () => true,
        () => [],
        (fragment, rangeToReplace) => {
          return [
            { ...pipeCompleteItem, text: ' | ' },
            { ...commaCompleteItem, text: ', ' },
            prependSpace(sortModifierSuggestions.NULLS_FIRST),
            prependSpace(sortModifierSuggestions.NULLS_LAST),
          ].map((suggestion) => ({
            ...suggestion,
            filterText: fragment,
            text: fragment + suggestion.text,
            rangeToReplace,
            command: TRIGGER_SUGGESTION_COMMAND,
          }));
        }
      );
    }
    case 'after_order': {
      return [
        sortModifierSuggestions.NULLS_FIRST,
        sortModifierSuggestions.NULLS_LAST,
        pipeCompleteItem,
        { ...commaCompleteItem, text: ', ', command: TRIGGER_SUGGESTION_COMMAND },
      ];
    }
    case 'nulls_complete': {
      return handleFragment(
        innerText,
        () => true,
        () => [],
        (fragment, rangeToReplace) => {
          return [
            { ...pipeCompleteItem, text: ' | ' },
            { ...commaCompleteItem, text: ', ' },
          ].map((suggestion) => ({
            ...suggestion,
            filterText: fragment,
            text: fragment + suggestion.text,
            rangeToReplace,
            command: TRIGGER_SUGGESTION_COMMAND,
          }));
        }
      );
    }
    case 'after_nulls': {
      return [
        pipeCompleteItem,
        { ...commaCompleteItem, text: ', ', command: TRIGGER_SUGGESTION_COMMAND },
      ];
    }
    default: {
      return [];
    }
  }

  const fieldSuggestions =
    (await callbacks?.getByType('any', [], {
      openSuggestions: true,
    })) ?? [];
  const functionSuggestions = await getFieldsOrFunctionsSuggestions(
    ['any'],
    Location.SORT,
    callbacks?.getByType,
    {
      functions: true,
      fields: false,
    }
  );

  return await handleFragment(
    innerText,
    (fragment: string) => columnExists(fragment, context),
    (_fragment: string, rangeToReplace?: { start: number; end: number }) => {
      // SORT fie<suggest>
      return [
        ...pushItUpInTheList(
          fieldSuggestions.map((suggestion) => {
            // if there is already a command, we don't want to override it
            if (suggestion.command) return suggestion;
            return {
              ...suggestion,
              command: TRIGGER_SUGGESTION_COMMAND,
              rangeToReplace,
            };
          }),
          true
        ),
        ...functionSuggestions,
      ];
    },
    (fragment: string, rangeToReplace: { start: number; end: number }) => {
      // SORT field<suggest>
      return [
        { ...pipeCompleteItem, text: ' | ' },
        { ...commaCompleteItem, text: ', ' },
        prependSpace(sortModifierSuggestions.ASC),
        prependSpace(sortModifierSuggestions.DESC),
        prependSpace(sortModifierSuggestions.NULLS_FIRST),
        prependSpace(sortModifierSuggestions.NULLS_LAST),
      ].map<ISuggestionItem>((s) => ({
        ...s,
        filterText: fragment,
        text: fragment + s.text,
        command: TRIGGER_SUGGESTION_COMMAND,
        rangeToReplace,
      }));
    }
  );
}
