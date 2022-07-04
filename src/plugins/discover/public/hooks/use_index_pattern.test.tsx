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

describe('Use data view', () => {
  test('returning a valid data view', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useDataView(dataViewsMock, 'the-data-view-id')
    );
    await waitForNextUpdate();
    expect(result.current.dataView).toBe(dataViewMock);
    expect(result.current.error).toBe(undefined);
  });

  test('returning an error', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useDataView(dataViewsMock, 'invalid-data-view-id')
    );
    await waitForNextUpdate();
    expect(result.current.dataView).toBe(undefined);
    expect(result.current.error).toBeTruthy();
  });
});
