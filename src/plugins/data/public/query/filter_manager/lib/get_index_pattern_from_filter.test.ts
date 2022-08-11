/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubIndexPattern, phraseFilter } from '../../../../common/stubs';
import { getIndexPatternFromFilter } from './get_index_pattern_from_filter';

describe('getIndexPatternFromFilter', () => {
  it('should return the index pattern from the filter', () => {
    const indexPattern = getIndexPatternFromFilter(phraseFilter, [stubIndexPattern]);
    expect(indexPattern).toBe(stubIndexPattern);
  });
});
