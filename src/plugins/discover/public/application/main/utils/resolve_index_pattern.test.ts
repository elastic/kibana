/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loadIndexPattern } from './resolve_index_pattern';
import { indexPatternsMock } from '../../../__mocks__/index_patterns';
import { indexPatternMock } from '../../../__mocks__/index_pattern';

describe('Resolve index pattern tests', () => {
  test('returns valid data for an existing index pattern', async () => {
    const indexPatternId = 'the-index-pattern-id';
    const result = await loadIndexPattern(indexPatternId, indexPatternsMock);
    expect(result.loaded).toEqual(indexPatternMock);
    expect(result.stateValFound).toEqual(true);
    expect(result.stateVal).toEqual(indexPatternId);
  });
  test('returns fallback data for an invalid index pattern', async () => {
    const indexPatternId = 'invalid-id';
    const result = await loadIndexPattern(indexPatternId, indexPatternsMock);
    expect(result.loaded).toEqual(indexPatternMock);
    expect(result.stateValFound).toBe(false);
    expect(result.stateVal).toBe(indexPatternId);
  });
});
