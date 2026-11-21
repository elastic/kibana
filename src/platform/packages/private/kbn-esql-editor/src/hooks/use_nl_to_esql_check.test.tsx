/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { clearNlToEsqlLicenseCache, useNlToEsqlCheck } from './use_nl_to_esql_check';

describe('useNlToEsqlCheck', () => {
  const coreStart = coreMock.createStart();

  const hasEnterpriseLicenseMock = jest.fn();

  const createWrapper =
    (esqlService?: { hasEnterpriseLicense: typeof hasEnterpriseLicenseMock }) =>
    ({ children }: { children: React.ReactNode }) =>
      (
        <KibanaContextProvider services={{ core: coreStart, esql: esqlService }}>
          <>{children}</>
        </KibanaContextProvider>
      );

  beforeEach(() => {
    jest.clearAllMocks();
    clearNlToEsqlLicenseCache();
    hasEnterpriseLicenseMock.mockResolvedValue(true);
  });

  it('should return false when the esql service is not available', () => {
    const { result } = renderHook(() => useNlToEsqlCheck(), {
      wrapper: createWrapper(undefined),
    });

    expect(result.current).toBe(false);
    expect(hasEnterpriseLicenseMock).not.toHaveBeenCalled();
  });

  it('should return true when license is enterprise', async () => {
    const { result } = renderHook(() => useNlToEsqlCheck(), {
      wrapper: createWrapper({ hasEnterpriseLicense: hasEnterpriseLicenseMock }),
    });

    await act(async () => {});

    expect(result.current).toBe(true);
  });

  it('should return false when license is not enterprise', async () => {
    hasEnterpriseLicenseMock.mockResolvedValue(false);

    const { result } = renderHook(() => useNlToEsqlCheck(), {
      wrapper: createWrapper({ hasEnterpriseLicense: hasEnterpriseLicenseMock }),
    });

    await act(async () => {});

    expect(result.current).toBe(false);
  });

  it('starts the next editor with the last known license result', async () => {
    const wrapper = createWrapper({ hasEnterpriseLicense: hasEnterpriseLicenseMock });
    const first = renderHook(() => useNlToEsqlCheck(), { wrapper });

    await act(async () => {});
    expect(first.result.current).toBe(true);

    const second = renderHook(() => useNlToEsqlCheck(), { wrapper });
    expect(second.result.current).toBe(true);
  });
});
