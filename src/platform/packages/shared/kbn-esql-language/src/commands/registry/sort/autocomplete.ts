/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLAstAllCommands, ESQLCommand } from '../../../types';
import {
  columnExists as _columnExists,
  getFragmentData,
  withAutoSuggest,
} from '../../definitions/utils/autocomplete/helpers';
import { suggestForExpression } from '../../definitions/utils';
import { commaCompleteItem, pipeCompleteItem } from '../complete_items';
import {
  Location,
  type ICommandCallbacks,
  type ICommandContext,
  type ISuggestionItem,
} from '../types';
import {
  getNullsPrefixRange,
  getSortPos,
  getSuggestionsAfterCompleteExpression,
  rightAfterColumn,
  sortModifierSuggestions,
} from './utils';
import { isColumn } from '../../../ast/is';

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition: number = query.length
): Promise<ISuggestionItem[]> {
  if (!callbacks?.getByType) {
    return [];
  }
  const innerText = query.substring(0, cursorPosition);
  const prependSpace = (suggestion: ISuggestionItem) => ({
    ...suggestion,
    text: ' ' + suggestion.text,
  });

  const commandText = innerText.slice(command.location.min);
  const { position: pos, expressionRoot } = getSortPos(commandText, command);

  switch (pos) {
    case 'expression': {
      const columnExists = (name: string) => _columnExists(name, context);
      const alreadyDeclaredFields = (command as ESQLCommand).args
        .filter(isColumn)
        .map((arg) => arg.parts.join('.'));

      const { suggestions: expressionSuggestions, computed } = await suggestForExpression({
        query,
        expressionRoot,
        command,
        cursorPosition,
        location: Location.SORT,
        context,
        callbacks,
        options: {
          addSpaceAfterFirstField: false,
          addSpaceAfterOperator: true,
          openSuggestions: true,
          ignoredColumnsForEmptyExpression: alreadyDeclaredFields,
        },
      });

      const suggestions: ISuggestionItem[] = [];

      if (computed.isComplete && !computed.insideFunction) {
        suggestions.push(
          ...getSuggestionsAfterCompleteExpression(innerText, expressionRoot, columnExists)
        );
      }

      if (!rightAfterColumn(innerText, expressionRoot, columnExists)) {
        suggestions.push(...expressionSuggestions);
      }

      const nullsPrefixRange = getNullsPrefixRange(innerText);

      if (nullsPrefixRange) {
        suggestions.forEach((suggestion) => {
          suggestion.rangeToReplace = nullsPrefixRange;
        });
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
