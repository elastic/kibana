/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { waitFor, act, renderHook } from '@testing-library/react';
import React from 'react';
import { discoverServiceMock } from '../../__mocks__/services';
import { useRootProfile } from './use_root_profile';
import { BehaviorSubject } from 'rxjs';

const mockSolutionNavId$ = new BehaviorSubject('solutionNavId');

jest
  .spyOn(discoverServiceMock.core.chrome, 'getActiveSolutionNavId$')
  .mockReturnValue(mockSolutionNavId$);

const render = () => {
  return renderHook(() => useRootProfile(), {
    wrapper: ({ children }) => (
      <KibanaContextProvider services={discoverServiceMock}>{children}</KibanaContextProvider>
    ),
  });
};

describe('useRootProfile', () => {
  beforeEach(() => {
    mockSolutionNavId$.next('solutionNavId');
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
    act(() => mockSolutionNavId$.next('newSolutionNavId'));
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
