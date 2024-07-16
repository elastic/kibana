/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { escapeRegExp, memoize } from 'lodash';
import { distance } from 'fastest-levenshtein';

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

  return new RegExp(globRegex.includes('*') ? `^${globRegex}$` : globRegex);
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
  const searchLower = fieldSearchHighlight.toLowerCase();
  const displayNameLower = field.displayName?.toLowerCase();
  const nameLower = field.name.toLowerCase();

  const regExp = makeRegEx(searchLower);
  const doesWildcardMatch =
    (!!displayNameLower && regExp.test(displayNameLower)) || regExp.test(nameLower);
  if (doesWildcardMatch) {
    return true;
  }

  if (searchLower.length < FUZZY_STRING_MIN_LENGTH) {
    return false;
  }
  return testFuzzySearch({ name: nameLower, displayName: displayNameLower }, searchLower);
};

const FUZZY_STRING_MIN_LENGTH = 4;
const FUZZY_SEARCH_DISTANCE = 1;

const testFuzzySearch = (field: { name: string; displayName?: string }, searchValue: string) => {
  return (
    Boolean(testFuzzySearchForString(field.displayName, searchValue)) ||
    (field.name !== field.displayName && Boolean(testFuzzySearchForString(field.name, searchValue)))
  );
};

const testFuzzySearchForString = (label: string | undefined, searchValue: string) => {
  if (!label || label.length < searchValue.length - 2) {
    return false;
  }

  const substrLength = Math.max(
    Math.min(searchValue.length, label.length),
    FUZZY_STRING_MIN_LENGTH
  );

  // performance optimization: instead of building the whole matrix,
  // only iterate through the strings of the substring length +- 1 character,
  // for example for searchValue = 'test' and label = 'test_value',
  // we iterate through 'test', 'est_', 'st_v' (and +- character cases too).
  const iterationsCount = label.length - substrLength + 1;
  for (let i = 0; i <= iterationsCount; i++) {
    for (let j = substrLength - 1; j <= substrLength + 1; j++) {
      if (compareLevenshtein(searchValue, label.substring(i, j + i))) {
        return label.substring(i, j + i);
      }
    }
  }
  return false;
};

const compareLevenshtein = (str1: string, str2: string) =>
  distance(str1, str2) <= FUZZY_SEARCH_DISTANCE;

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
  if (!fieldSearchHighlight) {
    return '';
  }
  const searchHighlight = (fieldSearchHighlight || '').trim();
  if (displayName.toLowerCase().indexOf(searchHighlight.toLowerCase()) > -1) {
    return searchHighlight;
  }
  return (
    testFuzzySearchForString(displayName.toLowerCase(), searchHighlight.toLowerCase()) ||
    displayName
  );
}
