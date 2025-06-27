/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { ESQLVariableType } from '@kbn/esql-types';
import type { ISuggestionItem, GetColumnsByTypeFn, ESQLUserDefinedColumn } from '../../types';
import { SINGLE_TICK_REGEX, DOUBLE_BACKTICK } from '../../constants';
import { Location } from '../../types';
import { getDateLiterals, getCompatibleLiterals } from '../../../definitions/literats';
import { getFunctionSuggestions } from '../../../definitions/functions';

export const shouldBeQuotedText = (
  text: string,
  { dashSupported }: { dashSupported?: boolean } = {}
) => {
  return dashSupported ? /[^a-zA-Z\d_\.@-]/.test(text) : /[^a-zA-Z\d_\.@]/.test(text);
};

export const getSafeInsertText = (text: string, options: { dashSupported?: boolean } = {}) => {
  return shouldBeQuotedText(text, options)
    ? `\`${text.replace(SINGLE_TICK_REGEX, DOUBLE_BACKTICK)}\``
    : text;
};

export const buildUserDefinedColumnsDefinitions = (
  userDefinedColumns: string[]
): ISuggestionItem[] =>
  userDefinedColumns.map((label) => ({
    label,
    text: getSafeInsertText(label),
    kind: 'Variable',
    detail: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.autocomplete.variableDefinition',
      {
        defaultMessage: `Column specified by the user within the ES|QL query`,
      }
    ),
    sortText: 'D',
  }));

export function pushItUpInTheList(suggestions: ISuggestionItem[], shouldPromote: boolean) {
  if (!shouldPromote) {
    return suggestions;
  }
  return suggestions.map(({ sortText, ...rest }) => ({
    ...rest,
    sortText: `1${sortText}`,
  }));
}

export const findFinalWord = (text: string) => {
  const words = text.split(/\s+/);
  return words[words.length - 1];
};

/**
 * This function handles the logic to suggest completions
 * for a given fragment of text in a generic way. A good example is
 * a field name.
 *
 * When typing a field name, there are 2 scenarios
 *
 * 1. field name is incomplete (includes the empty string)
 * KEEP /
 * KEEP fie/
 *
 * 2. field name is complete
 * KEEP field/
 *
 * This function provides a framework for detecting and handling both scenarios in a clean way.
 *
 * @param innerText - the query text before the current cursor position
 * @param isFragmentComplete — return true if the fragment is complete
 * @param getSuggestionsForIncomplete — gets suggestions for an incomplete fragment
 * @param getSuggestionsForComplete - gets suggestions for a complete fragment
 * @returns
 */
export function handleFragment(
  innerText: string,
  isFragmentComplete: (fragment: string) => boolean,
  getSuggestionsForIncomplete: (
    fragment: string,
    rangeToReplace?: { start: number; end: number }
  ) => ISuggestionItem[] | Promise<ISuggestionItem[]>,
  getSuggestionsForComplete: (
    fragment: string,
    rangeToReplace: { start: number; end: number }
  ) => ISuggestionItem[] | Promise<ISuggestionItem[]>
): ISuggestionItem[] | Promise<ISuggestionItem[]> {
  /**
   * @TODO — this string manipulation is crude and can't support all cases
   * Checking for a partial word and computing the replacement range should
   * really be done using the AST node, but we'll have to refactor further upstream
   * to make that available. This is a quick fix to support the most common case.
   */
  const fragment = findFinalWord(innerText);
  if (!fragment) {
    return getSuggestionsForIncomplete('');
  } else {
    const rangeToReplace = {
      start: innerText.length - fragment.length,
      end: innerText.length,
    };
    if (isFragmentComplete(fragment)) {
      return getSuggestionsForComplete(fragment, rangeToReplace);
    } else {
      return getSuggestionsForIncomplete(fragment, rangeToReplace);
    }
  }
}

/**
 * TODO — split this into distinct functions, one for fields, one for functions, one for literals
 */
export async function getFieldsOrFunctionsSuggestions(
  types: string[],
  location: Location,
  getFieldsByType: GetColumnsByTypeFn,
  {
    functions,
    fields,
    userDefinedColumns,
    values = false,
    literals = false,
  }: {
    functions: boolean;
    fields: boolean;
    userDefinedColumns?: Map<string, ESQLUserDefinedColumn[]>;
    literals?: boolean;
    values?: boolean;
  },
  {
    ignoreFn = [],
    ignoreColumns = [],
  }: {
    ignoreFn?: string[];
    ignoreColumns?: string[];
  } = {}
): Promise<ISuggestionItem[]> {
  const filteredFieldsByType = pushItUpInTheList(
    (await (fields
      ? getFieldsByType(types, ignoreColumns, {
          advanceCursor: location === Location.SORT,
          openSuggestions: location === Location.SORT,
          variableType: values ? ESQLVariableType.VALUES : ESQLVariableType.FIELDS,
        })
      : [])) as ISuggestionItem[],
    functions
  );

  const filteredColumnByType: string[] = [];
  if (userDefinedColumns) {
    for (const userDefinedColumn of userDefinedColumns.values()) {
      if (
        (types.includes('any') || types.includes(userDefinedColumn[0].type)) &&
        !ignoreColumns.includes(userDefinedColumn[0].name)
      ) {
        filteredColumnByType.push(userDefinedColumn[0].name);
      }
    }
    // due to a bug on the ES|QL table side, filter out fields list with underscored userDefinedColumns names (??)
    // avg( numberField ) => avg_numberField_
    const ALPHANUMERIC_REGEXP = /[^a-zA-Z\d]/g;
    if (
      filteredColumnByType.length &&
      filteredColumnByType.some((v) => ALPHANUMERIC_REGEXP.test(v))
    ) {
      for (const userDefinedColumn of filteredColumnByType) {
        const underscoredName = userDefinedColumn.replace(ALPHANUMERIC_REGEXP, '_');
        const index = filteredFieldsByType.findIndex(
          ({ label }) => underscoredName === label || `_${underscoredName}_` === label
        );
        if (index >= 0) {
          filteredFieldsByType.splice(index);
        }
      }
    }
  }
  // could also be in stats (bucket) but our autocomplete is not great yet
  const displayDateSuggestions =
    types.includes('date') && [Location.WHERE, Location.EVAL].includes(location);

  const suggestions = filteredFieldsByType.concat(
    displayDateSuggestions ? getDateLiterals() : [],
    functions
      ? getFunctionSuggestions({
          location,
          returnTypes: types,
          ignored: ignoreFn,
        })
      : [],
    userDefinedColumns
      ? pushItUpInTheList(buildUserDefinedColumnsDefinitions(filteredColumnByType), functions)
      : [],
    literals ? getCompatibleLiterals(types) : []
  );

  return suggestions;
}
