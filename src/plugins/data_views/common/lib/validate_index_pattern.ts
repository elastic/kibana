/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ILLEGAL_CHARACTERS_VISIBLE, CONTAINS_SPACES_KEY, ILLEGAL_CHARACTERS_KEY } from './types';

function indexPatternContainsSpaces(indexPattern: string): boolean {
  return indexPattern.includes(' ');
}

function findIllegalCharacters(indexPattern: string): string[] {
  const illegalCharacters = ILLEGAL_CHARACTERS_VISIBLE.reduce((chars: string[], char: string) => {
    if (indexPattern.includes(char)) {
      chars.push(char);
    }
    return chars;
  }, []);

  return illegalCharacters;
}

/**
 * Validates index pattern strings
 * @param indexPattern
 * @returns Object with validation errors
 */

export function validateIndexPattern(indexPattern: string) {
  const errors: { [ILLEGAL_CHARACTERS_KEY]?: string[]; [CONTAINS_SPACES_KEY]?: boolean } = {};

  const illegalCharacters = findIllegalCharacters(indexPattern);

  if (illegalCharacters.length) {
    errors[ILLEGAL_CHARACTERS_KEY] = illegalCharacters;
  }

  if (indexPatternContainsSpaces(indexPattern)) {
    errors[CONTAINS_SPACES_KEY] = true;
  }

  return errors;
}
