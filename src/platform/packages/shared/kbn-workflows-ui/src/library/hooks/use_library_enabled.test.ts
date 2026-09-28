/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { of } from 'rxjs';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useLibraryEnabled } from './use_library_enabled';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

describe('useLibraryEnabled', () => {
  it('returns true when the global setting observable emits true', () => {
    jest.mocked(useKibana).mockReturnValue({
      services: {
        settings: {
          globalClient: {
            get: jest.fn().mockReturnValue(false),
            get$: jest.fn().mockReturnValue(of(true)),
          },
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    const { result } = renderHook(() => useLibraryEnabled());

    expect(result.current).toBe(true);
  });

  it('defaults to false when the global settings client is unavailable', () => {
    jest
      .mocked(useKibana)
      .mockReturnValue({ services: {} } as unknown as ReturnType<typeof useKibana>);

    const { result } = renderHook(() => useLibraryEnabled());

    expect(result.current).toBe(false);
  });

  it('defaults to false when the global setting is not overridden', () => {
    jest.mocked(useKibana).mockReturnValue({
      services: {
        settings: {
          globalClient: {
            get: jest.fn().mockReturnValue(false),
            get$: jest.fn().mockReturnValue(of(false)),
          },
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    const { result } = renderHook(() => useLibraryEnabled());

    expect(result.current).toBe(false);
  });
});
