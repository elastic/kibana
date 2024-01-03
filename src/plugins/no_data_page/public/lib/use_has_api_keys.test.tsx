/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { renderHook } from '@testing-library/react-hooks';
import { createUseHasApiKeys } from './use_has_api_keys';

describe('React hook for "Has API Keys"', () => {
  let mockHttp: HttpSetup;
  let useHasApiKeys: ReturnType<typeof createUseHasApiKeys>;

  beforeEach(() => {
    mockHttp = httpServiceMock.createSetupContract({ basePath: '/test' });
    useHasApiKeys = createUseHasApiKeys({ http: mockHttp });
  });

  it('returns default data', () => {
    const httpGetSpy = jest.spyOn(mockHttp, 'get');
    httpGetSpy.mockResolvedValue({ hasApiKeys: true });

    const { result } = renderHook(() => useHasApiKeys());
    expect(result.error).toBe(undefined);
    expect(result.current).toEqual({
      error: null,
      hasApiKeys: null,
      loading: true,
    });
  });

  it('when API keys are present', async () => {
    const httpGetSpy = jest.spyOn(mockHttp, 'get');
    httpGetSpy.mockResolvedValue({ hasApiKeys: true });

    const { result, waitForNextUpdate } = renderHook(() => useHasApiKeys());
    await waitForNextUpdate();

    expect(result.error).toBe(undefined);
    expect(result.current).toEqual({
      error: null,
      hasApiKeys: true,
      loading: false,
    });
  });

  it('when API keys are not present', async () => {
    const httpGetSpy = jest.spyOn(mockHttp, 'get');
    httpGetSpy.mockResolvedValue({ hasApiKeys: false });

    const { result, waitForNextUpdate } = renderHook(() => useHasApiKeys());
    await waitForNextUpdate();

    expect(result.error).toBe(undefined);
    expect(result.current).toEqual({
      error: null,
      hasApiKeys: false,
      loading: false,
    });
  });

  it('forwards the error', async () => {
    const httpGetSpy = jest.spyOn(mockHttp, 'get');
    httpGetSpy.mockRejectedValue('bad thing');

    const { result, waitForNextUpdate } = renderHook(() => useHasApiKeys());
    await waitForNextUpdate();

    expect(result.error).toBe(undefined);
    expect(result.current).toEqual({
      error: 'bad thing',
      hasApiKeys: null,
      loading: false,
    });
  });
});
