/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { withAutoSuggest } from '../../../definitions/utils/autocomplete/helpers';
import { getInsideFunctionsSuggestions } from '../../../definitions/utils/autocomplete/functions';
import {
  columnExists as _columnExists,
  getFragmentData,
  suggestForExpression,
} from '../../../definitions/utils/autocomplete/helpers';
import { getExpressionType, isExpressionComplete } from '../../../definitions/utils/expressions';
import type { ESQLCommand } from '../../../types';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';
import type { ICommandCallbacks } from '../../types';
import { Location, type ICommandContext, type ISuggestionItem } from '../../types';
import {
  getNullsPrefixRange,
  getSortPos,
  getSuggestionsAfterCompleteExpression,
  rightAfterColumn,
  sortModifierSuggestions,
} from './utils';

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

  const functionsSpecificSuggestions = await getInsideFunctionsSuggestions(
    innerText,
    cursorPosition,
    callbacks,
    context
  );
  if (functionsSpecificSuggestions) {
    return functionsSpecificSuggestions;
  }

  const commandText = innerText.slice(command.location.min);

  const pos = getSortPos(commandText, command);

  switch (pos) {
    case 'empty_expression': {
      return await suggestForExpression({
        innerText,
        getColumnsByType: callbacks?.getByType,
        expressionRoot: undefined,
        location: Location.SORT,
        hasMinimumLicenseRequired: callbacks?.hasMinimumLicenseRequired,
        activeProduct: context?.activeProduct,
        context,
        advanceCursorAfterInitialColumn: false,
      });
    }

    case 'expression': {
      const expressionRoot = command.args[command.args.length - 1];
      if (!expressionRoot || Array.isArray(expressionRoot)) {
        // guaranteed by the getSortPos function, but we check it here for type safety
        return [];
      }

      const suggestions: ISuggestionItem[] = [];

      const columnExists = (name: string) => _columnExists(name, context);

      if (isExpressionComplete(getExpressionType(expressionRoot, context?.columns), innerText)) {
        suggestions.push(
          ...getSuggestionsAfterCompleteExpression(innerText, expressionRoot, columnExists)
        );
      }

      if (!rightAfterColumn(innerText, expressionRoot, columnExists)) {
        const expressionSuggestions = await suggestForExpression({
          innerText,
          getColumnsByType: callbacks?.getByType,
          expressionRoot,
          location: Location.SORT,
          context,
          hasMinimumLicenseRequired: callbacks?.hasMinimumLicenseRequired,
          activeProduct: context?.activeProduct,
        });
        suggestions.push(...expressionSuggestions);
      }

      const nullsPrefixRange = getNullsPrefixRange(innerText);
      if (nullsPrefixRange) {
        suggestions.forEach((s) => (s.rangeToReplace = nullsPrefixRange));
      }

      return suggestions;
    }

    case 'order_complete': {
      const { fragment, rangeToReplace } = getFragmentData(innerText);

      return [
        { ...pipeCompleteItem, text: ' | ' },
        { ...commaCompleteItem, text: ', ' },
        prependSpace(sortModifierSuggestions.NULLS_FIRST),
        prependSpace(sortModifierSuggestions.NULLS_LAST),
      ].map((suggestion) =>
        withAutoSuggest({
          ...suggestion,
          filterText: fragment,
          text: fragment + suggestion.text,
          rangeToReplace,
        })
      );
    }

    case 'after_order': {
      const nullsPrefixRange = getNullsPrefixRange(innerText);
      return [
        sortModifierSuggestions.NULLS_FIRST,
        sortModifierSuggestions.NULLS_LAST,
        pipeCompleteItem,
        withAutoSuggest({ ...commaCompleteItem, text: ', ' }),
      ].map((suggestion) => ({
        ...suggestion,
        rangeToReplace: nullsPrefixRange,
      }));
    }

    case 'nulls_complete': {
      const { fragment, rangeToReplace } = getFragmentData(innerText);

      return [
        { ...pipeCompleteItem, text: ' | ' },
        { ...commaCompleteItem, text: ', ' },
      ].map((suggestion) =>
        withAutoSuggest({
          ...suggestion,
          filterText: fragment,
          text: fragment + suggestion.text,
          rangeToReplace,
        })
      );
    }

    case 'after_nulls': {
      return [pipeCompleteItem, withAutoSuggest({ ...commaCompleteItem, text: ', ' })];
    }

    default: {
      return [];
    }
  }
}
