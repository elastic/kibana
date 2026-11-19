/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorPublic } from './types';
import { useLocatorUrl } from './use_locator_url';

const createLocator = (getUrl: LocatorPublic<SerializableRecord>['getUrl']) =>
  ({ getUrl } as LocatorPublic<SerializableRecord>);

describe('useLocatorUrl', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('returns the URL once a pending getUrl() resolves while mounted', async () => {
    let resolveUrl: (url: string) => void = () => {};
    const locator = createLocator(
      () =>
        new Promise<string>((resolve) => {
          resolveUrl = resolve;
        })
    );

    const { result } = renderHook(() => useLocatorUrl(locator, {}));
    expect(result.current).toBe('');

    resolveUrl('/app/test');
    await waitFor(() => expect(result.current).toBe('/app/test'));
  });

  it('logs and clears a previously resolved URL when a later getUrl() rejects', async () => {
    const resolving = createLocator(() => Promise.resolve('/app/test'));
    const rejecting = createLocator(() => Promise.reject(new Error('fail')));

    const { result, rerender } = renderHook(({ locator }) => useLocatorUrl(locator, {}), {
      initialProps: { locator: resolving },
    });
    await waitFor(() => expect(result.current).toBe('/app/test'));

    rerender({ locator: rejecting });

    await waitFor(() => expect(result.current).toBe(''));
    expect(consoleError).toHaveBeenCalledWith('useLocatorUrl', expect.any(Error));
  });

  it('does not log an error when getUrl() rejects after unmount', async () => {
    let rejectUrl: (error: Error) => void = () => {};
    const pending = new Promise<string>((_, reject) => {
      rejectUrl = reject;
    });
    const locator = createLocator(() => pending);

    const { unmount } = renderHook(() => useLocatorUrl(locator, {}));
    unmount();

    rejectUrl(new Error('fail'));
    await pending.catch(() => {});
    await Promise.resolve();

    expect(consoleError).not.toHaveBeenCalled();
  });
});
