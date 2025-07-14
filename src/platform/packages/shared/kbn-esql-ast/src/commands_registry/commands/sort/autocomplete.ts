/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
// import { isColumn } from '../../../ast/is';
import { getExpressionType, isExpressionComplete } from '../../../definitions/utils/expressions';
import { ICommandCallbacks, Location } from '../../types';
import type { ESQLCommand } from '../../../types';
import { type ISuggestionItem, type ICommandContext } from '../../types';
import { pipeCompleteItem, commaCompleteItem } from '../../complete_items';
import {
  handleFragment,
  suggestForExpression,
} from '../../../definitions/utils/autocomplete/helpers';
import { TRIGGER_SUGGESTION_COMMAND } from '../../constants';
import { getSortPos, sortModifierSuggestions } from './utils';

export async function autocomplete(
  query: string,
  command: ESQLCommand<'sort'>,
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
        innerText,
        getColumnsByType: callbacks?.getByType,
        expressionRoot: undefined,
        location: Location.SORT,
        context,
      });
    }
    case 'expression': {
      const expressionRoot = command.args[command.args.length - 1];
      if (!expressionRoot || Array.isArray(expressionRoot)) {
        // guaranteed by the getSortPos function, but we check it here for type safety
        return [];
      }

      const suggestions = await suggestForExpression({
        innerText,
        getColumnsByType: callbacks?.getByType,
        expressionRoot,
        location: Location.SORT,
        context,
      });

      const sortCommandKeywordSuggestions = [
        sortModifierSuggestions.ASC,
        sortModifierSuggestions.DESC,
        sortModifierSuggestions.NULLS_FIRST,
        sortModifierSuggestions.NULLS_LAST,
        { ...pipeCompleteItem, sortText: 'AAA' },
        { ...commaCompleteItem, text: ', ', command: TRIGGER_SUGGESTION_COMMAND, sortText: 'AAA' },
      ];

      // // special case: cursor right after a column name
      // if (isColumn(expressionRoot) && !/\s+$/.test(innerText)) {
      //   sortCommandKeywordSuggestions.forEach((s) => {
      //     s.text = `${expressionRoot.text} ${s.text}`; // add a space after the column name
      //     s.filterText = expressionRoot.text; // turn off Monaco's filtering by the suggestion text
      //   });
      // }

      if (
        isExpressionComplete(
          getExpressionType(expressionRoot, context?.fields, context?.userDefinedColumns),
          innerText
        )
      ) {
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
}
