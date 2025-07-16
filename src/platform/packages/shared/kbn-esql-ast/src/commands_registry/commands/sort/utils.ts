/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFragmentData } from '../../../definitions/utils/autocomplete/helpers';
import {
  pipeCompleteItem,
  type ESQLCommand,
  type ESQLSingleAstItem,
  commaCompleteItem,
  isColumn,
} from '../../../..';
import { TRIGGER_SUGGESTION_COMMAND } from '../../constants';
import { ISuggestionItem } from '../../types';

export type SortPosition =
  | 'empty_expression'
  | 'expression'
  | 'order_complete'
  | 'after_order'
  | 'nulls_complete'
  | 'after_nulls';

export const getSortPos = (query: string, command: ESQLCommand): SortPosition | undefined => {
  const lastArg = command.args[command.args.length - 1];
  if (!lastArg || /,\s+$/.test(query)) {
    return 'empty_expression';
  }

  if (!Array.isArray(lastArg) && lastArg.type !== 'order') {
    return 'expression';
  }

  if (/(?:asc|desc)$/i.test(query)) {
    return 'order_complete';
  }

  if (/(?:asc|desc)\s+(?:N?U?L?L?S? ?(FI?R?S?|LA?S?)?)$/i.test(query)) {
    return 'after_order';
  }

  if (/(?:nulls\s+first|nulls\s+last)$/i.test(query)) {
    return 'nulls_complete';
  }

  if (/(?:nulls\s+first|nulls\s+last)\s+$/i.test(query)) {
    return 'after_nulls';
  }
};

const sortModifierSuggestions = {
  ASC: {
    label: 'ASC',
    text: 'ASC',
    detail: '',
    kind: 'Keyword',
    sortText: '1-ASC',
    command: TRIGGER_SUGGESTION_COMMAND,
  } as ISuggestionItem,
  DESC: {
    label: 'DESC',
    text: 'DESC',
    detail: '',
    kind: 'Keyword',
    sortText: '1-DESC',
    command: TRIGGER_SUGGESTION_COMMAND,
  } as ISuggestionItem,
  NULLS_FIRST: {
    label: 'NULLS FIRST',
    text: 'NULLS FIRST',
    detail: '',
    kind: 'Keyword',
    sortText: '2-NULLS FIRST',
    command: TRIGGER_SUGGESTION_COMMAND,
  } as ISuggestionItem,
  NULLS_LAST: {
    label: 'NULLS LAST',
    text: 'NULLS LAST',
    detail: '',
    kind: 'Keyword',
    sortText: '2-NULLS LAST',
    command: TRIGGER_SUGGESTION_COMMAND,
  } as ISuggestionItem,
};

export const getSuggestionsAfterCompleteExpression = (
  innerText: string,
  expressionRoot: ESQLSingleAstItem | undefined
): ISuggestionItem[] => {
  let sortCommandKeywordSuggestions = [
    sortModifierSuggestions.ASC,
    sortModifierSuggestions.DESC,
    ...getNullsSuggestions(innerText),
  ];

  const pipeSuggestion = { ...pipeCompleteItem, sortText: 'AAA' };
  const commaSuggestion = {
    ...commaCompleteItem,
    text: ', ',
    command: TRIGGER_SUGGESTION_COMMAND,
    sortText: 'AAA',
  };

  // does the query end with whitespace?
  if (/\s$/.test(innerText)) {
    // if so, comma needs to be sent back a column to replace the trailing space
    commaSuggestion.rangeToReplace = {
      start: innerText.length - 1,
      end: innerText.length,
    };
  }
  // special case: cursor right after a column name
  else if (
    isColumn(expressionRoot) &&
    // this prevents the branch from being entered for something like "SORT column NULLS LA/"
    /sort\s+\S+$/i.test(innerText)
  ) {
    const { fragment, rangeToReplace } = getFragmentData(innerText);

    sortCommandKeywordSuggestions = sortCommandKeywordSuggestions.map((s) => ({
      ...s,
      text: `${fragment} ${s.text}`, // add a space after the column name
      filterText: fragment, // turn off Monaco's filtering by the suggestion text
      rangeToReplace,
    }));

    pipeSuggestion.filterText = fragment;
    pipeSuggestion.text = fragment + ' ' + pipeSuggestion.text;
    pipeSuggestion.rangeToReplace = rangeToReplace;

    commaSuggestion.filterText = fragment;
    commaSuggestion.text = fragment + ' ' + commaSuggestion.text;
    commaSuggestion.rangeToReplace = rangeToReplace;
  }

  return [...sortCommandKeywordSuggestions, pipeSuggestion, commaSuggestion];
};

const NULLS_REGEX = /(?<nulls>NU?L?L?S?\s+(FI?R?S?T?|LA?S?T?)?)$/i;

export const getNullsSuggestions = (innerText: string): ISuggestionItem[] => {
  const matchResult = innerText.match(NULLS_REGEX);
  const nulls = matchResult?.groups?.nulls;

  const rangeToReplace = nulls
    ? {
        start: innerText.length - nulls.length,
        end: innerText.length,
      }
    : undefined;

  return [
    { ...sortModifierSuggestions.NULLS_FIRST, rangeToReplace },
    { ...sortModifierSuggestions.NULLS_LAST, rangeToReplace },
  ];
};
