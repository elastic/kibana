/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import { useNavigateToExecution } from './use_navigate_to_execution';
import { PLUGIN_ID } from '../../../common';
import { createStartServicesMock, createUseKibanaMockValue } from '../../mocks';
import { useKibana } from '../use_kibana';

vi.mock('../use_kibana');

const mockUseKibana = useKibana as MockedFunction<typeof useKibana>;

describe('useNavigateToExecution', () => {
  let mockNavigateToApp: Mock;
  let mockGetUrlForApp: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    const services = createStartServicesMock();
    mockNavigateToApp = vi.fn();
    mockGetUrlForApp = vi.fn(
      (appId: string, opts: { path: string }) => `/app/${appId}${opts.path}`
    );
    (services.application.navigateToApp as Mock) = mockNavigateToApp;
    (services.application.getUrlForApp as Mock) = mockGetUrlForApp;
    mockUseKibana.mockReturnValue(createUseKibanaMockValue(services));
  });

  it('should return href with executions tab for a workflow without executionId', () => {
    const { result } = renderHook(() => useNavigateToExecution({ workflowId: 'wf-1' }));

    expect(result.current.href).toBe(`/app/${PLUGIN_ID}/wf-1?tab=executions`);
  });

  it('should return href with executionId when provided', () => {
    const { result } = renderHook(() =>
      useNavigateToExecution({ workflowId: 'wf-1', executionId: 'exec-42' })
    );

    expect(result.current.href).toBe(`/app/${PLUGIN_ID}/wf-1?tab=executions&executionId=exec-42`);
  });

  it('should call navigateToApp with the correct path when navigate is called', () => {
    const { result } = renderHook(() =>
      useNavigateToExecution({ workflowId: 'wf-1', executionId: 'exec-42' })
    );

    act(() => {
      result.current.navigate();
    });

    expect(mockNavigateToApp).toHaveBeenCalledWith(PLUGIN_ID, {
      path: '/wf-1?tab=executions&executionId=exec-42',
    });
  });

  it('should call navigateToApp without executionId when not provided', () => {
    const { result } = renderHook(() => useNavigateToExecution({ workflowId: 'wf-1' }));

    act(() => {
      result.current.navigate();
    });

    expect(mockNavigateToApp).toHaveBeenCalledWith(PLUGIN_ID, {
      path: '/wf-1?tab=executions',
    });
  });
});
