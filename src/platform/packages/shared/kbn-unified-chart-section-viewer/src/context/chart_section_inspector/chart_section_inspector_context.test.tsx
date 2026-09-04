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
import { ChartSectionInspectorProvider } from './chart_section_inspector_context';
import { useChartSectionInspector } from './use_chart_section_inspector';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ChartSectionInspectorProvider>{children}</ChartSectionInspectorProvider>
);

const tracked = <T,>(data: T) => ({
  data,
  request: { query: data },
  response: { ok: true },
});

describe('ChartSectionInspectorProvider', () => {
  it('keeps sequential trackRequest entries until resetRequests', async () => {
    const { result } = renderHook(() => useChartSectionInspector(), { wrapper });

    await act(async () => {
      await result.current.trackRequest('Grid of metrics', 'capability', async () => tracked(1));
      await result.current.trackRequest('Metrics with data', 'membership', async () => tracked(2));
    });

    expect(result.current.requestAdapter.getRequests().map((request) => request.name)).toEqual([
      'Grid of metrics',
      'Metrics with data',
    ]);

    act(() => {
      result.current.resetRequests();
    });

    expect(result.current.requestAdapter.getRequests()).toEqual([]);
  });

  it('does not drop a successful request when a later trackRequest fails', async () => {
    const { result } = renderHook(() => useChartSectionInspector(), { wrapper });

    await act(async () => {
      await result.current.trackRequest('Grid of metrics', 'capability', async () => tracked(1));
    });

    await expect(
      act(async () => {
        await result.current.trackRequest('Metrics with data', 'membership', async () => {
          throw new Error('membership failed');
        });
      })
    ).rejects.toThrow('membership failed');

    expect(result.current.requestAdapter.getRequests().map((request) => request.name)).toEqual([
      'Grid of metrics',
      'Metrics with data',
    ]);
  });
});
