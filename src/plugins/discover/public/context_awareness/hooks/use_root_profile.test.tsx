/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { discoverServiceMock } from '../../__mocks__/services';
import { useRootProfile } from './use_root_profile';
import { BehaviorSubject } from 'rxjs';
import { act } from '@testing-library/react';

const mockSolutionNavId$ = new BehaviorSubject('solutionNavId');

jest
  .spyOn(discoverServiceMock.core.chrome, 'getActiveSolutionNavId$')
  .mockReturnValue(mockSolutionNavId$);

const render = () => {
  return renderHook(() => useRootProfile(), {
    initialProps: { solutionNavId: 'solutionNavId' } as React.PropsWithChildren<{
      solutionNavId: string;
    }>,
    wrapper: ({ children }) => (
      <KibanaContextProvider services={discoverServiceMock}>{children}</KibanaContextProvider>
    ),
  });
};

describe('useRootProfile', () => {
  beforeEach(() => {
    mockSolutionNavId$.next('solutionNavId');
  });

  it('should return rootProfileLoading as true', () => {
    const { result } = render();
    expect(result.current.rootProfileLoading).toBe(true);
  });

  it('should return rootProfileLoading as false', async () => {
    const { result, waitForNextUpdate } = render();
    await waitForNextUpdate();
    expect(result.current.rootProfileLoading).toBe(false);
  });

  it('should return rootProfileLoading as true when solutionNavId changes', async () => {
    const { result, rerender, waitForNextUpdate } = render();
    await waitForNextUpdate();
    expect(result.current.rootProfileLoading).toBe(false);
    act(() => mockSolutionNavId$.next('newSolutionNavId'));
    rerender();
    expect(result.current.rootProfileLoading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.rootProfileLoading).toBe(false);
  });
});
