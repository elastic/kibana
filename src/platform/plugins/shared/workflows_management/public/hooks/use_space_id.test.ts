/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useKibana } from './use_kibana';
import { useSpaceId } from './use_space_id';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('useSpaceId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the current space ID', async () => {
    mockUseKibana.mockReturnValue({
      services: {
        spaces: {
          getActiveSpace: jest.fn().mockResolvedValue({ id: 'my-space' }),
        },
      },
    } as any);

    const { result } = renderHook(() => useSpaceId());

    await waitFor(() => {
      expect(result.current).toBe('my-space');
    });
  });

  it('should return undefined initially before space is loaded', () => {
    mockUseKibana.mockReturnValue({
      services: {
        spaces: {
          getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
        },
      },
    } as any);

    const { result } = renderHook(() => useSpaceId());

    expect(result.current).toBeUndefined();
  });

  it('should return undefined when spaces service is not available', () => {
    mockUseKibana.mockReturnValue({
      services: { spaces: undefined },
    } as any);

    const { result } = renderHook(() => useSpaceId());

    expect(result.current).toBeUndefined();
  });
});
