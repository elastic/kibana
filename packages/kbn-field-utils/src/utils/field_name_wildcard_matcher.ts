/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { escapeRegExp, memoize } from 'lodash';
import levenshtein from 'js-levenshtein';

const makeRegEx = memoize(function makeRegEx(glob: string) {
  const trimmedGlob = glob.trim();
  let globRegex = trimmedGlob
    .split(/[* ]+/) // wildcard or space as a separator
    .map(escapeRegExp)
    .join('.*');

  // the search with spaces is less strict than with wildcard:
  // we allow any start/ending of search results
  if (trimmedGlob.includes(' ')) {
    globRegex = '.*' + globRegex + '.*';
  }

  return new RegExp(globRegex.includes('*') ? `^${globRegex}$` : globRegex, 'i');
});

/**
 * Checks if field displayName or name matches the provided search string.
 * The search string can have wildcard.
 * @param field
 * @param fieldSearchHighlight
 */
export const fieldNameWildcardMatcher = (
  field: { name: string; displayName?: string },
  fieldSearchHighlight: string
): boolean => {
  if (!fieldSearchHighlight?.trim()) {
    return false;
  }

  const regExp = makeRegEx(fieldSearchHighlight);
  const doesWildcardMatch =
    (!!field.displayName && regExp.test(field.displayName)) || regExp.test(field.name);
  if (doesWildcardMatch) {
    return true;
  }

  return testFuzzySearch(field, fieldSearchHighlight);
};

const STRING_MIN_LENGTH = 4;
const FUZZY_SEARCH_DISTANCE = 1;

const testFuzzySearch = (field: { name: string; displayName?: string }, searchValue: string) => {
  if (searchValue.length < STRING_MIN_LENGTH) {
    return false;
  }
  return (
    testFuzzySearchForString(field.displayName?.toLowerCase(), searchValue.toLowerCase()) ||
    testFuzzySearchForString(field.name.toLowerCase(), searchValue.toLowerCase())
  );
};

const testFuzzySearchForString = (label: string | undefined, searchValue: string) => {
  if (!label) {
    return false;
  }

  const substrLength = Math.max(Math.min(searchValue.length, label.length), STRING_MIN_LENGTH);
  // performance optimization: instead of building the whole matrix,
  // only iterate through the strings of the substring length +- 1 character,
  // for example for searchValue = 'test' and label = 'test_value',
  // we iterate through 'test', 'est_', 'st_v' (and +- character cases too).

  const iterationsCount = label.length - substrLength + 1;
  for (let i = 0; i <= iterationsCount; i++) {
    for (let j = substrLength - 1; j <= substrLength + 1; j++) {
      if (compareLevenshtein(searchValue, label.substring(i, j + i))) {
        return true;
      }
    }
  }
  return false;
};

const compareLevenshtein = (str1: string, str2: string) =>
  levenshtein(str1, str2) <= FUZZY_SEARCH_DISTANCE;

/**
 * Adapts fieldNameWildcardMatcher to combobox props.
 * @param field
 * @param fieldSearchHighlight
 */
export const comboBoxFieldOptionMatcher = ({
  option: { name, label },
  searchValue,
}: {
  option: { name?: string; label: string };
  searchValue: string;
}) => fieldNameWildcardMatcher({ name: name || label, displayName: label }, searchValue);

/**
 * Get `highlight` string to be used together with `EuiHighlight`
 * @param displayName
 * @param fieldSearchHighlight
 */
export function getFieldSearchMatchingHighlight(
  displayName: string,
  fieldSearchHighlight?: string
): string {
  const searchHighlight = (fieldSearchHighlight || '').trim();
  if (
    (searchHighlight.includes('*') || searchHighlight.includes(' ')) &&
    fieldNameWildcardMatcher({ name: displayName }, searchHighlight)
  ) {
    return displayName;
  }

  return searchHighlight;
}
