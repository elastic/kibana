/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { withAutoSuggest } from '../../../definitions/utils/autocomplete/helpers';
import { getFragmentData } from '../../../definitions/utils/autocomplete/helpers';
import {
  pipeCompleteItem,
  type ESQLCommand,
  type ESQLSingleAstItem,
  commaCompleteItem,
  isColumn,
} from '../../../..';
import type { ISuggestionItem } from '../../types';

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

  if (/(?:asc|desc)\s+(?:N?U?L?L?S? ?(F?I?R?S?|LA?S?)?)$/i.test(query)) {
    return 'after_order';
  }

  if (/(?:nulls\s+first|nulls\s+last)$/i.test(query)) {
    return 'nulls_complete';
  }

  if (/(?:nulls\s+first|nulls\s+last)\s+$/i.test(query)) {
    return 'after_nulls';
  }
};

export const sortModifierSuggestions = {
  ASC: withAutoSuggest({
    label: 'ASC',
    text: 'ASC',
    detail: '',
    kind: 'Keyword',
    sortText: '1-ASC',
  }),
  DESC: withAutoSuggest({
    label: 'DESC',
    text: 'DESC',
    detail: '',
    kind: 'Keyword',
    sortText: '1-DESC',
  }),
  NULLS_FIRST: withAutoSuggest({
    label: 'NULLS FIRST',
    text: 'NULLS FIRST',
    detail: '',
    kind: 'Keyword',
    sortText: '2-NULLS FIRST',
  }),
  NULLS_LAST: withAutoSuggest({
    label: 'NULLS LAST',
    text: 'NULLS LAST',
    detail: '',
    kind: 'Keyword',
    sortText: '2-NULLS LAST',
  }),
};

export const rightAfterColumn = (
  innerText: string,
  expressionRoot: ESQLSingleAstItem | undefined,
  columnExists: (name: string) => boolean
): boolean => {
  return (
    isColumn(expressionRoot) &&
    columnExists(expressionRoot.parts.join('.')) &&
    // this prevents the branch from being entered for something like "SORT column NULLS LA/"
    // where the "NULLS LA" won't be in the AST so expressionRoot will just be the column
    /(?:sort|,)\s+\S+$/i.test(innerText)
  );
};

export const getSuggestionsAfterCompleteExpression = (
  innerText: string,
  expressionRoot: ESQLSingleAstItem | undefined,
  columnExists: (name: string) => boolean
): ISuggestionItem[] => {
  let sortCommandKeywordSuggestions = [
    { ...sortModifierSuggestions.ASC },
    { ...sortModifierSuggestions.DESC },
    { ...sortModifierSuggestions.NULLS_FIRST },
    { ...sortModifierSuggestions.NULLS_LAST },
  ];

  const pipeSuggestion = { ...pipeCompleteItem };
  const commaSuggestion = withAutoSuggest({
    ...commaCompleteItem,
    text: ', ',
  });

  // does the query end with whitespace?
  if (/\s$/.test(innerText)) {
    // if so, comma needs to be sent back a column to replace the trailing space
    commaSuggestion.rangeToReplace = {
      start: innerText.length - 1,
      end: innerText.length,
    };
  }
  // special case: cursor right after a column name
  else if (isColumn(expressionRoot) && rightAfterColumn(innerText, expressionRoot, columnExists)) {
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
    commaSuggestion.text = fragment + commaSuggestion.text;
    commaSuggestion.rangeToReplace = rangeToReplace;
  }

  return [...sortCommandKeywordSuggestions, pipeSuggestion, commaSuggestion];
};

const IS_REGEX = /(?:I+S*\s+(?:N+O*T*\s+)?(N(U(L(L)?)?)?)?)\s*$/i;
const NULLS_REGEX = /(?<nulls>NULLS\s+(FI?R?S?T?|LA?S?T?)?)$/i;

/**
 * The nulls clauses are tricky because they contain whitespace.
 *
 * This function returns the overlap range between the end of the string
 * and the start of any existing NULLS clause.
 *
 * This range needs to be applied to _all_ the suggestions that are returned
 * in any context where the nulls clause is valid because Monaco needs to filter
 * suggestions based on a full prefix.
 *
 * For example, if the user types "SORT column NULLS F", the suggestions
 * will need to be filtered against the full "NULLS F" prefix instead of just "F".
 *
 * Otherwise, invalid suggestions like `FLOOR` could show up leading the user to
 * "SORT column NULLS FLOOR" which is not valid.
 *
 * @param innerText
 * @returns
 */
export const getNullsPrefixRange = (
  innerText: string
): { start: number; end: number } | undefined => {
  if (IS_REGEX.test(innerText)) {
    // we're in an IS NULL or IS NOT NULL context, so we don't need to return a range
    return undefined;
  }

  const matchResult = innerText.match(NULLS_REGEX);
  const nulls = matchResult?.groups?.nulls;

  return nulls
    ? {
        start: innerText.length - nulls.length,
        end: innerText.length,
      }
    : undefined;
};
