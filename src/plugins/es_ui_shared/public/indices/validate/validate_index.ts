/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { INDEX_ILLEGAL_CHARACTERS_VISIBLE } from '../constants';

// Names beginning with periods are reserved for hidden indices.
export function indexNameBeginsWithPeriod(indexName?: string): boolean {
  if (indexName === undefined) {
    return false;
  }
  return indexName[0] === '.';
}

export function findIllegalCharactersInIndexName(indexName: string): string[] {
  const illegalCharacters = INDEX_ILLEGAL_CHARACTERS_VISIBLE.reduce(
    (chars: string[], char: string): string[] => {
      if (indexName.includes(char)) {
        chars.push(char);
      }

      return chars;
    },
    []
  );

  return illegalCharacters;
}

export function indexNameContainsSpaces(indexName: string): boolean {
  return indexName.includes(' ');
}
