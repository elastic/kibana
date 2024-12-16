/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { INDEX_ILLEGAL_CHARACTERS_VISIBLE } from '../constants';

import {
  indexNameBeginsWithPeriod,
  findIllegalCharactersInIndexName,
  indexNameContainsSpaces,
} from './validate_index';

describe('Index name validation', () => {
  it('should not allow name to begin with a period', () => {
    const beginsWithPeriod = indexNameBeginsWithPeriod('.system_index');
    expect(beginsWithPeriod).toBe(true);
  });

  it('should not allow space in the name', () => {
    const containsSpaces = indexNameContainsSpaces('my name');
    expect(containsSpaces).toBe(true);
  });

  it('should not allow illegal characters', () => {
    INDEX_ILLEGAL_CHARACTERS_VISIBLE.forEach((char) => {
      const illegalCharacters = findIllegalCharactersInIndexName(`name${char}`);
      expect(illegalCharacters).toEqual([char]);
    });
  });
});
