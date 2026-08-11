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

  it('should delegate reportEvent calls to the telemetry service', async () => {
    const mockReportEvent = jest.fn();
    const { useKibana } = await import('./use_kibana');
    (useKibana as jest.Mock).mockReturnValue({
      services: { workflowsManagement: { telemetry: { reportEvent: mockReportEvent } } },
    });

    const { useTelemetry } = await import('./use_telemetry');
    const { result } = renderHook(() => useTelemetry());

    result.current.reportWorkflowCreated({ workflowId: 'wf-1' });

    expect(mockReportEvent).toHaveBeenCalledTimes(1);
    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ workflowId: 'wf-1' })
    );
  });

  it('should return a no-op instance that does not throw when telemetry is unavailable', async () => {
    const { useKibana } = await import('./use_kibana');
    (useKibana as jest.Mock).mockReturnValue({
      services: { workflowsManagement: undefined },
    });

    const { useTelemetry } = await import('./use_telemetry');
    const { result } = renderHook(() => useTelemetry());

    // Calling a telemetry method should not throw
    expect(() => result.current.reportWorkflowCreated({ workflowId: 'wf-1' })).not.toThrow();
  });

  it('should return the same telemetry instance on subsequent calls', async () => {
    const { useTelemetry } = await import('./use_telemetry');
    const { result: result1 } = renderHook(() => useTelemetry());
    const { result: result2 } = renderHook(() => useTelemetry());

    expect(result1.current).toBe(result2.current);
  });
});
