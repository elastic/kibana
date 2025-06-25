/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor, act, renderHook } from '@testing-library/react';
import React from 'react';
import { discoverServiceMock } from '../../__mocks__/services';
import { useRootProfile } from './use_root_profile';
import { BehaviorSubject } from 'rxjs';
import { DiscoverTestProvider } from '../../__mocks__/test_provider';
import type { SolutionId } from '@kbn/core-chrome-browser';

const mockSolutionNavId$ = new BehaviorSubject<SolutionId>(
  'solutionNavId' as unknown as SolutionId
);

jest
  .spyOn(discoverServiceMock.core.chrome, 'getActiveSolutionNavId$')
  .mockReturnValue(mockSolutionNavId$);

const render = () => {
  return renderHook(() => useRootProfile(), {
    wrapper: ({ children }) => (
      <DiscoverTestProvider services={discoverServiceMock}>{children}</DiscoverTestProvider>
    ),
  });
};

describe('useRootProfile', () => {
  beforeEach(() => {
    mockSolutionNavId$.next('solutionNavId' as unknown as SolutionId);
  });

  it('should return rootProfileLoading as true', async () => {
    const { result } = render();
    expect(result.current.rootProfileLoading).toBe(true);
    expect((result.current as Record<string, unknown>).AppWrapper).toBeUndefined();
    expect((result.current as Record<string, unknown>).getDefaultAdHocDataViews).toBeUndefined();
    // avoid act warning
    await waitFor(() => new Promise((resolve) => resolve(null)));
  });

  it('should return rootProfileLoading as false', async () => {
    const { result } = render();
    await waitFor(() => {
      expect(result.current.rootProfileLoading).toBe(false);
      expect((result.current as Record<string, unknown>).AppWrapper).toBeDefined();
      expect((result.current as Record<string, unknown>).getDefaultAdHocDataViews).toBeDefined();
    });
  });

  it('should return rootProfileLoading as true when solutionNavId changes', async () => {
    const { result, rerender } = render();
    await waitFor(() => {
      expect(result.current.rootProfileLoading).toBe(false);
      expect((result.current as Record<string, unknown>).AppWrapper).toBeDefined();
      expect((result.current as Record<string, unknown>).getDefaultAdHocDataViews).toBeDefined();
    });
    act(() => mockSolutionNavId$.next('newSolutionNavId' as unknown as SolutionId));
    rerender();
    expect(result.current.rootProfileLoading).toBe(true);
    expect((result.current as Record<string, unknown>).AppWrapper).toBeUndefined();
    expect((result.current as Record<string, unknown>).getDefaultAdHocDataViews).toBeUndefined();
    await waitFor(() => {
      expect(result.current.rootProfileLoading).toBe(false);
      expect((result.current as Record<string, unknown>).AppWrapper).toBeDefined();
      expect((result.current as Record<string, unknown>).getDefaultAdHocDataViews).toBeDefined();
    });
  });
});
