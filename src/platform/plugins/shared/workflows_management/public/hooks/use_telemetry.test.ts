/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';

jest.mock('./use_kibana');

describe('useTelemetry', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should return a WorkflowsBaseTelemetry instance when telemetry service is available', async () => {
    // The auto-mock from __mocks__/use_kibana.ts provides workflowsManagement.telemetry
    const { useTelemetry } = await import('./use_telemetry');
    const { result } = renderHook(() => useTelemetry());

    expect(result.current).toBeDefined();
    expect(typeof result.current.reportWorkflowCreated).toBe('function');
  });

  it('should return a no-op WorkflowsBaseTelemetry instance when telemetry is not available', async () => {
    const { useKibana } = await import('./use_kibana');
    (useKibana as jest.Mock).mockReturnValue({
      services: { workflowsManagement: undefined },
    });

    const { useTelemetry } = await import('./use_telemetry');
    const { result } = renderHook(() => useTelemetry());

    expect(result.current).toBeDefined();
    expect(typeof result.current.reportWorkflowCreated).toBe('function');
  });

  it('should return the same telemetry instance on subsequent calls', async () => {
    const { useTelemetry } = await import('./use_telemetry');
    const { result: result1 } = renderHook(() => useTelemetry());
    const { result: result2 } = renderHook(() => useTelemetry());

    expect(result1.current).toBe(result2.current);
  });
});
