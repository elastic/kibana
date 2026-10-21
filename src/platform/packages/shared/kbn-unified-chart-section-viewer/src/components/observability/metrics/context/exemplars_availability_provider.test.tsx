/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('../utils/fetch_metrics_with_exemplars', () => ({
  fetchMetricsWithExemplars: jest.fn(),
}));

import React from 'react';
import { renderHook } from '@testing-library/react';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import { fetchMetricsWithExemplars } from '../utils/fetch_metrics_with_exemplars';
import {
  ExemplarsAvailabilityProvider,
  useExemplarsAvailabilityProbe,
} from './exemplars_availability_provider';

const mockFetch = fetchMetricsWithExemplars as jest.MockedFunction<
  typeof fetchMetricsWithExemplars
>;

const requestParams = {
  search: jest.fn() as unknown as ISearchGeneric,
  timeFieldName: '@timestamp',
  timeRange: { from: 'now-15m', to: 'now' },
  uiSettings: {} as IUiSettingsClient,
  profileId: 'metrics-data-source-profile',
};
const fetchId = 1_700_000_000_000;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ExemplarsAvailabilityProvider>{children}</ExemplarsAvailabilityProvider>
);

/** One provider instance; every call to `probe` goes through the same shared ref. */
const renderProbe = () =>
  renderHook(() => useExemplarsAvailabilityProbe(), { wrapper }).result.current;

describe('ExemplarsAvailabilityProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue(
      new Map([
        ['exemplars-generic.otel-default', new Set(['metrics.http.server.request.duration'])],
      ])
    );
  });

  it('forwards the request parameters to the probe fetch', async () => {
    const probe = renderProbe();

    await probe({ ...requestParams, fetchId, onError: jest.fn() });

    expect(mockFetch).toHaveBeenCalledWith({ ...requestParams, signal: expect.any(AbortSignal) });
  });

  it('aborts the superseded probe when the fetch id changes', async () => {
    const probe = renderProbe();

    await probe({ ...requestParams, fetchId, onError: jest.fn() });
    const first = mockFetch.mock.calls[0][0].signal!;
    await probe({ ...requestParams, fetchId: fetchId + 1, onError: jest.fn() });
    const second = mockFetch.mock.calls[1][0].signal!;

    expect(first.aborted).toBe(true);
    expect(second.aborted).toBe(false);
  });

  it('aborts the pending probe when the provider unmounts', async () => {
    const { result, unmount } = renderHook(() => useExemplarsAvailabilityProbe(), { wrapper });

    await result.current({ ...requestParams, fetchId, onError: jest.fn() });
    const { signal } = mockFetch.mock.calls[0][0];
    unmount();

    expect(signal!.aborted).toBe(true);
  });

  it('shares one request between concurrent callers', async () => {
    const probe = renderProbe();

    const [first, second] = await Promise.all([
      probe({ ...requestParams, fetchId, onError: jest.fn() }),
      probe({ ...requestParams, fetchId, onError: jest.fn() }),
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('caches a non-empty result for later callers in the same fetch', async () => {
    const probe = renderProbe();

    await probe({ ...requestParams, fetchId, onError: jest.fn() });
    await probe({ ...requestParams, fetchId, onError: jest.fn() });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('starts a new probe when the fetch id changes', async () => {
    const probe = renderProbe();

    await probe({ ...requestParams, fetchId, onError: jest.fn() });
    await probe({ ...requestParams, fetchId: fetchId + 1, onError: jest.fn() });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('caches an empty result for the same fetch and probes again on the next one', async () => {
    mockFetch.mockResolvedValue(new Map());
    const probe = renderProbe();

    expect((await probe({ ...requestParams, fetchId, onError: jest.fn() })).size).toBe(0);
    await probe({ ...requestParams, fetchId, onError: jest.fn() });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await probe({ ...requestParams, fetchId: fetchId + 1, onError: jest.fn() });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does not share state between provider instances', async () => {
    await renderProbe()({ ...requestParams, fetchId, onError: jest.fn() });
    await renderProbe()({ ...requestParams, fetchId, onError: jest.fn() });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  describe('when the probe fails', () => {
    const probeError = new Error('verification_exception: Unknown index');

    it('reports once across concurrent callers, resolves both to an empty set, and retries on the next fetch', async () => {
      mockFetch.mockRejectedValueOnce(probeError);
      const probe = renderProbe();
      const firstOnError = jest.fn();
      const secondOnError = jest.fn();

      const [first, second] = await Promise.all([
        probe({ ...requestParams, fetchId, onError: firstOnError }),
        probe({ ...requestParams, fetchId, onError: secondOnError }),
      ]);

      expect(first.size).toBe(0);
      expect(second.size).toBe(0);
      expect(firstOnError).toHaveBeenCalledTimes(1);
      expect(firstOnError).toHaveBeenCalledWith(probeError);
      expect(secondOnError).not.toHaveBeenCalled();

      await probe({ ...requestParams, fetchId, onError: jest.fn() });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await probe({ ...requestParams, fetchId: fetchId + 1, onError: jest.fn() });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('does not report an abort', async () => {
      mockFetch.mockRejectedValueOnce(
        Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
      );
      const probe = renderProbe();
      const onError = jest.fn();

      expect((await probe({ ...requestParams, fetchId, onError })).size).toBe(0);
      expect(onError).not.toHaveBeenCalled();
    });
  });

  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useExemplarsAvailabilityProbe())).toThrow(
      'useExemplarsAvailabilityProbe must be used within an ExemplarsAvailabilityProvider'
    );
  });
});
