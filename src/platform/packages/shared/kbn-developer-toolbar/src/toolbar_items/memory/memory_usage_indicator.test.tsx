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
    expect(screen.getByTestId('memoryBadge').getAttribute('data-icon-type')).toBeNull();

    act(() => publish(memoryInfo(900, 0.85)));
    expect(screen.getByTestId('memoryBadge').getAttribute('data-color')).toBe('#0B1628');

    act(() => publish(memoryInfo(900, 0.86)));
    expect(screen.getByTestId('memoryBadge').getAttribute('data-color')).toBe('warning');
    expect(screen.getByTestId('memoryBadge').getAttribute('data-icon-type')).toBe('warningFill');
    expect(screen.getByRole('tooltip').textContent).toContain(
      'More than 85% of the browser-reported heap limit is in use.'
    );
    expect(screen.getByRole('tooltip').textContent).not.toContain(
      'Sustained heap growth; possible leak.'
    );

    act(() => publish(memoryInfo(200, 0.25, true)));
    expect(screen.getByTestId('memoryBadge').getAttribute('data-color')).toBe('warning');
    expect(screen.getByRole('tooltip').textContent).toContain(
      'Sustained heap growth; possible leak.'
    );
    expect(screen.getByRole('tooltip').textContent).not.toContain(
      'More than 85% of the browser-reported heap limit is in use.'
    );

    act(() => publish(memoryInfo(900, 0.86, true)));
    expect(screen.getByTestId('memoryBadge').getAttribute('data-color')).toBe('danger');
    expect(screen.getByRole('tooltip').textContent).toContain(
      'Sustained heap growth; possible leak.'
    );
    expect(screen.getByRole('tooltip').textContent).toContain(
      'More than 85% of the browser-reported heap limit is in use.'
    );

  });

  it('shows trend only when enough samples and a finite slope are available', () => {
    render(<MemoryUsageIndicator />);

    act(() => publish(memoryInfo(512, 0.25, false, { sampleCount: 9, shortTrendPerMin: 25.04 })));
    expect(screen.getByRole('tooltip').textContent).toContain('Recent trend: collecting samples…');

    act(() =>
      publish(memoryInfo(512, 0.25, false, { sampleCount: 10, shortTrendPerMin: 25.04 }))
    );
    expect(screen.getByRole('tooltip').textContent).toContain('Recent trend: +25.0 MiB/min');
    expect(screen.getByTestId('memoryBadge').getAttribute('data-color')).toBe('#0B1628');

    act(() =>
      publish(memoryInfo(512, 0.25, false, { sampleCount: 10, shortTrendPerMin: -0.01 }))
    );
    expect(screen.getByRole('tooltip').textContent).toContain('Recent trend: 0.0 MiB/min');
    expect(screen.getByRole('tooltip').textContent).not.toContain('-0.0');

    act(() => publish(memoryInfo(512, 0.25, false, { sampleCount: 10 })));
    expect(screen.getByRole('tooltip').textContent).toContain('Recent trend: 0.0 MiB/min');

    act(() => publish(memoryInfo(512, 0.25, false, { sampleCount: 10, shortTrendPerMin: NaN })));
    expect(screen.getByRole('tooltip').textContent).toContain('Recent trend unavailable.');
  });

  it('clears stale measured details when memory becomes unavailable', () => {
    render(<MemoryUsageIndicator />);
    expect(screen.getByRole('tooltip').textContent).toContain('Measuring JavaScript heap…');

    act(() => publish(memoryInfo(1024, 0.25)));
    expect(screen.getByText('Mem 1.00GiB')).toBeTruthy();
    expect(screen.getByRole('tooltip').textContent).toContain('Heap: 1.00 GiB');

    act(() => publish(null));
    expect(screen.getByText('Mem -GiB')).toBeTruthy();
    expect(screen.getByRole('tooltip').textContent).toContain('JavaScript heap unavailable.');
    expect(screen.getByRole('tooltip').textContent).not.toContain('Heap: 1.00 GiB');
  });
});
