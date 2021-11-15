/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useIndexPattern } from './use_index_pattern';
import { indexPatternMock } from '../__mocks__/index_pattern';
import { indexPatternsMock } from '../__mocks__/index_patterns';
import { renderHook } from '@testing-library/react-hooks';

describe('Use Index Pattern', () => {
  test('returning a valid index pattern', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useIndexPattern(indexPatternsMock, 'the-index-pattern-id')
    );
    await waitForNextUpdate();
    expect(result.current.indexPattern).toBe(indexPatternMock);
    expect(result.current.error).toBe(undefined);
  });

  test('returning an error', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useIndexPattern(indexPatternsMock, 'invalid-index-pattern-id')
    );
    await waitForNextUpdate();
    expect(result.current.indexPattern).toBe(undefined);
    expect(result.current.error).toBeTruthy();
  });
});
