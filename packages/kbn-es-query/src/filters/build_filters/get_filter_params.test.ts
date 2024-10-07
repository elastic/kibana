/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { phraseFilter, phrasesFilter, rangeFilter, existsFilter } from '../stubs';
import { getFilterParams } from './get_filter_params';

describe('getFilterParams', () => {
  it('should retrieve params from phrase filter', () => {
    const params = getFilterParams(phraseFilter);
    expect(params).toBe('ios');
  });

  it('should retrieve params from phrases filter', () => {
    const params = getFilterParams(phrasesFilter);
    expect(params).toEqual(['win xp', 'osx']);
  });

  it('should retrieve params from range filter', () => {
    const params = getFilterParams(rangeFilter);
    expect(params).toEqual({ from: 0, to: 10 });
  });

  it('should return undefined for exists filter', () => {
    const params = getFilterParams(existsFilter);
    expect(params).toBeUndefined();
  });
});
