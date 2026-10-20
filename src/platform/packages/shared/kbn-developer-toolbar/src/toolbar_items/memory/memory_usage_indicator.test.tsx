/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryMonitor, type MemoryInfo } from './memory_monitor';
import { MemoryUsageIndicator } from './memory_usage_indicator';

jest.mock('@elastic/eui', () => ({
  EuiToolTip: ({ children, content }: React.PropsWithChildren<{ content: React.ReactNode }>) => (
    <div>
      {children}
      <div role="tooltip">{content}</div>
    </div>
  ),
  EuiBadge: ({
    children,
    color,
    iconType,
  }: React.PropsWithChildren<{ color: string; iconType?: string }>) => (
    <span data-test-subj="memoryBadge" data-color={color} data-icon-type={iconType}>
      {children}
    </span>
  ),
  EuiTextColor: ({ children, color }: React.PropsWithChildren<{ color: string }>) => (
    <span data-color={color}>{children}</span>
  ),
}));

const memoryInfo = (
  memoryUsage: number,
  heapUsageRatio: number,
  growthDetected = false,
  options: { sampleCount?: number; shortTrendPerMin?: number } = {}
): MemoryInfo => ({
  memoryUsage,
  heapUsageRatio,
  growthDetected,
  sampleCount: options.sampleCount ?? 1,
  shortTrendPerMin: options.shortTrendPerMin ?? 0,
});

describe('MemoryUsageIndicator', () => {
  let publish: Parameters<MemoryMonitor['subscribe']>[0];

  beforeEach(() => {
    jest.spyOn(MemoryMonitor.prototype, 'subscribe').mockImplementation((callback) => {
      publish = callback;
      return jest.fn();
    });
    jest.spyOn(MemoryMonitor.prototype, 'startMonitoring').mockImplementation();
    jest.spyOn(MemoryMonitor.prototype, 'destroy').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('warns for heap pressure or growth, not absolute heap size', () => {
    render(<MemoryUsageIndicator />);

    act(() => publish(memoryInfo(1536, 0.25)));
    expect(screen.getByTestId('memoryBadge').getAttribute('data-color')).toBe('#0B1628');

    act(() => publish(memoryInfo(900, 0.85)));
    expect(screen.getByTestId('memoryBadge').getAttribute('data-color')).toBe('#0B1628');

    act(() => publish(memoryInfo(900, 0.86)));
    expect(screen.getByTestId('memoryBadge').getAttribute('data-color')).toBe('warning');
    expect(screen.getByRole('tooltip').textContent).not.toContain('Heap growing steadily.');

    act(() => publish(memoryInfo(200, 0.25, true)));
    expect(screen.getByTestId('memoryBadge').getAttribute('data-color')).toBe('warning');
    expect(screen.getByRole('tooltip').textContent).toContain('Heap growing steadily.');

    act(() => publish(memoryInfo(900, 0.86, true)));
    expect(screen.getByTestId('memoryBadge').getAttribute('data-color')).toBe('danger');
  });

  it('shows trend only with enough samples and a finite slope, and drops stale details when unavailable', () => {
    render(<MemoryUsageIndicator />);
    expect(screen.getByRole('tooltip').textContent).toContain('Measuring…');

    act(() => publish(memoryInfo(512, 0.25, false, { sampleCount: 9, shortTrendPerMin: 25.04 })));
    expect(screen.getByRole('tooltip').textContent).not.toContain('Trend:');

    act(() => publish(memoryInfo(1024, 0.25, false, { sampleCount: 10, shortTrendPerMin: 25.04 })));
    expect(screen.getByRole('tooltip').textContent).toContain('Trend: +25.0 MiB/min');
    expect(screen.getByRole('tooltip').textContent).toContain('Heap: 1.00 GiB (25% of limit)');
    expect(screen.getByRole('tooltip').textContent).not.toContain('JS heap:');
    expect(screen.getByText('Mem 1.00 GiB')).toBeTruthy();

    act(() => publish(memoryInfo(512, 0.25, false, { sampleCount: 10, shortTrendPerMin: NaN })));
    expect(screen.getByRole('tooltip').textContent).not.toContain('Trend:');

    act(() => publish(null));
    expect(screen.getByText('Mem —')).toBeTruthy();
    expect(screen.getByRole('tooltip').textContent).toContain('Not supported in this browser.');
    expect(screen.getByRole('tooltip').textContent).not.toContain('Heap: 1.00 GiB');
  });
});
