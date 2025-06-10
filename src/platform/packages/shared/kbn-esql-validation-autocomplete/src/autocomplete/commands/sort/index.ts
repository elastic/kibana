/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isSingleItem } from '../../../shared/helpers';
import { CommandSuggestParams, Location } from '../../../definitions/types';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';
import { TRIGGER_SUGGESTION_COMMAND } from '../../factories';
import { handleFragment, isExpressionComplete, suggestForExpression } from '../../helper';
import type { SuggestionRawDefinition } from '../../types';
import { getSortPos, sortModifierSuggestions } from './helper';

export async function suggest(
  params: CommandSuggestParams<'sort'>
): Promise<SuggestionRawDefinition[]> {
  const { command, innerText, getExpressionType } = params;
  const prependSpace = (s: SuggestionRawDefinition) => ({ ...s, text: ' ' + s.text });

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
}
