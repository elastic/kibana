/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useDataView } from './use_index_pattern';
import { dataViewMock } from '../__mocks__/index_pattern';
import { dataViewsMock } from '../__mocks__/index_patterns';
import { renderHook } from '@testing-library/react-hooks';

describe('Use Index Pattern', () => {
  test('returning a valid index pattern', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useDataView(dataViewsMock, 'the-index-pattern-id')
    );
    await waitForNextUpdate();
    expect(result.current.dataView).toBe(dataViewMock);
    expect(result.current.error).toBe(undefined);
  });

  test('returning an error', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useDataView(dataViewsMock, 'invalid-index-pattern-id')
    );
    await waitForNextUpdate();
    expect(result.current.dataView).toBe(undefined);
    expect(result.current.error).toBeTruthy();
  });
});
