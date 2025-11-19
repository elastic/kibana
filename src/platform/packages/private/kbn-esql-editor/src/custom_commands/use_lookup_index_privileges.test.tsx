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
import { useLookupIndexPrivileges } from './use_lookup_index_privileges';
import { coreMock } from '@kbn/core/public/mocks';
import { LOOKUP_INDEX_PRIVILEGES_ROUTE } from '@kbn/esql-types';

describe('useLookupIndexPrivileges', () => {
  const services = coreMock.createStart();

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <KibanaContextProvider services={services}>
        <>{children}</>
      </KibanaContextProvider>
    );
  };

  beforeEach(() => {});

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch permissions for a list of index names', async () => {
    const indexNames = ['index-1', 'index-2'];
    const mockPrivileges = {
      'index-1': { create_index: true, write: true, read: true },
      'index-2': { create_index: false, write: false, read: true },
    };
    services.http.get.mockResolvedValue(mockPrivileges);

    const { result } = renderHook(() => useLookupIndexPrivileges(), {
      wrapper,
    });

    let permissions;
    await act(async () => {
      permissions = await result.current.getPermissions(indexNames);
    });

    expect(services.http.get).toHaveBeenCalledWith(LOOKUP_INDEX_PRIVILEGES_ROUTE, {
      query: { indexName: 'index-1,index-2' },
    });
    expect(permissions).toEqual({
      'index-1': {
        canCreateIndex: true,
        canEditIndex: true,
        canReadIndex: true,
      },
      'index-2': {
        canCreateIndex: false,
        canEditIndex: false,
        canReadIndex: true,
      },
    });
  });

  it('should fetch all permissions when no index names are provided', async () => {
    const mockPrivileges = {
      '*': { create_index: false, write: false, read: false },
    };
    services.http.get.mockResolvedValue(mockPrivileges);

    const { result } = renderHook(() => useLookupIndexPrivileges(), { wrapper });

    let permissions;
    await act(async () => {
      permissions = await result.current.getPermissions();
    });

    expect(services.http.get).toHaveBeenCalledWith(LOOKUP_INDEX_PRIVILEGES_ROUTE, {});
    expect(permissions).toEqual({
      '*': {
        canCreateIndex: false,
        canEditIndex: false,
        canReadIndex: false,
      },
    });
  });

  it('should handle empty index names array', async () => {
    services.http.get.mockResolvedValue({});
    const { result } = renderHook(() => useLookupIndexPrivileges(), { wrapper });

    let permissions;
    await act(async () => {
      permissions = await result.current.getPermissions([]);
    });

    expect(permissions).toEqual({
      '*': {
        canCreateIndex: false,
        canEditIndex: false,
        canReadIndex: false,
      },
    });
  });

  it('should use cache for subsequent calls with the same index names', async () => {
    const indexNames = ['index-1'];
    const mockPrivileges = {
      'index-1': { create_index: true, write: true, read: true },
    };
    services.http.get.mockResolvedValue(mockPrivileges);

    const { result } = renderHook(() => useLookupIndexPrivileges(), { wrapper });

    await act(async () => {
      await result.current.getPermissions(indexNames);
    });
    await act(async () => {
      await result.current.getPermissions(indexNames);
    });

    expect(services.http.get).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors gracefully', async () => {
    services.http.get.mockRejectedValue(new Error('API Error'));
    const { result } = renderHook(() => useLookupIndexPrivileges(), { wrapper });

    let permissions;
    await act(async () => {
      permissions = await result.current.getPermissions(['index-3']);
    });

    expect(permissions).toEqual({
      'index-3': {
        canCreateIndex: false,
        canEditIndex: false,
        canReadIndex: false,
      },
    });
  });
});
