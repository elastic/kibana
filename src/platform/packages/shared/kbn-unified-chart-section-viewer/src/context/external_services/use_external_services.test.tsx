/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import type { ExternalServices } from '../../types';
import { ExternalServicesProvider } from './external_services_context';
import { useExternalServices } from './use_external_services';

describe('useExternalServices', () => {
  it('returns undefined when no provider is mounted', () => {
    const { result } = renderHook(() => useExternalServices());
    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the provider is mounted without an externalServices value', () => {
    const { result } = renderHook(() => useExternalServices(), {
      wrapper: ({ children }) => <ExternalServicesProvider>{children}</ExternalServicesProvider>,
    });
    expect(result.current).toBeUndefined();
  });

  it('returns the value passed to the provider', () => {
    const externalServices = { share: {}, discoverShared: {} } as unknown as ExternalServices;

    const { result } = renderHook(() => useExternalServices(), {
      wrapper: ({ children }) => (
        <ExternalServicesProvider externalServices={externalServices}>
          {children}
        </ExternalServicesProvider>
      ),
    });

    expect(result.current).toBe(externalServices);
  });
});
