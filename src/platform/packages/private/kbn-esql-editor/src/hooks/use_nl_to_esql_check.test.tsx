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
import { useNlToEsqlCheck } from './use_nl_to_esql_check';

describe('useNlToEsqlCheck', () => {
  const coreStart = coreMock.createStart();

  const validLicense = {
    status: 'active' as const,
    hasAtLeast: jest.fn().mockReturnValue(true),
  };

  const invalidLicense = {
    status: 'active' as const,
    hasAtLeast: jest.fn().mockReturnValue(false),
  };

  const getLicenseMock = jest.fn();

  const createWrapper =
    (esqlService?: { getLicense: typeof getLicenseMock }) =>
    ({ children }: { children: React.ReactNode }) =>
      (
        <KibanaContextProvider services={{ core: coreStart, esql: esqlService }}>
          <>{children}</>
        </KibanaContextProvider>
      );

  beforeEach(() => {
    jest.clearAllMocks();
    getLicenseMock.mockResolvedValue(validLicense);
  });

  it('should return false when getLicense is not available', () => {
    const { result } = renderHook(() => useNlToEsqlCheck(), {
      wrapper: createWrapper(undefined),
    });

    expect(result.current).toBe(false);
    expect(getLicenseMock).not.toHaveBeenCalled();
  });

  it('should return true when license is enterprise', async () => {
    const { result } = renderHook(() => useNlToEsqlCheck(), {
      wrapper: createWrapper({ getLicense: getLicenseMock }),
    });

    await act(async () => {});

    expect(result.current).toBe(true);
    expect(getLicenseMock).toHaveBeenCalledTimes(1);
  });

  it('should return false when license is not enterprise', async () => {
    getLicenseMock.mockResolvedValue(invalidLicense);

    const { result } = renderHook(() => useNlToEsqlCheck(), {
      wrapper: createWrapper({ getLicense: getLicenseMock }),
    });

    await act(async () => {});

    expect(result.current).toBe(false);
  });
});
