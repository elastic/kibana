/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { PerformanceInfo } from './performance_monitor';
import { PerformanceMonitor } from './performance_monitor';
import type { LongTaskInfo } from './long_task_monitor';
import { LongTaskMonitor } from './long_task_monitor';
import type { INPInfo } from './inp_monitor';
import { INPMonitor } from './inp_monitor';
import { FrameJankIndicator } from './frame_jank_indicator';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const ReactModule = jest.requireActual<typeof React>('react');
  const MockToolTip = ({
    children,
    content,
  }: React.PropsWithChildren<{ content: React.ReactNode }>) => {
    const [open, setOpen] = ReactModule.useState(false);
    return (
      <div onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
        {children}
        {open && <div role="tooltip">{content}</div>}
      </div>
    );
  };

  return {
    ...actual,
    useEuiTheme: () => ({
      euiTheme: {
        colors: {
          emptyShade: '#fff',
          severity: { warning: '#f5a700', danger: '#bd271e', neutral: '#69707d' },
        },
      },
    }),
    EuiBadge: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <span {...props}>{children}</span>
    ),
    EuiTextColor: ({ children, color }: React.PropsWithChildren<{ color: string }>) => (
      <span data-color={color}>{children}</span>
    ),
    EuiToolTip: MockToolTip,
  };
});

type PerfCallback = (info: PerformanceInfo) => void;
type TaskCallback = (info: LongTaskInfo) => void;
type InpCallback = (info: INPInfo) => void;

const neutralPerf: PerformanceInfo = {
  fps: 60,
  jankPercentage: 0,
  baselineFps: 60,
  history: [60, 60, 60],
  maxFps: 60,
  minFps: 60,
};
const neutralTask: LongTaskInfo = {
  worstTaskDuration: 0,
  worstTaskStartTime: null,
  totalBlockingTime: 0,
  tasksInLast30Seconds: 0,
};
const neutralInp: INPInfo = {
  currentINP: 0,
  slowInteractionsCount: 0,
  worstInteractionDelay: 0,
  worstInteractionStartTime: null,
};

const warningTrigger = () => screen.getByLabelText(/^Performance warning:/);

describe('FrameJankIndicator warnings', () => {
  let perfCallback: PerfCallback;
  let taskCallback: TaskCallback;
  let inpCallback: InpCallback;
  let now = 10_000;

  beforeEach(() => {
    now = 10_000;
    jest.useFakeTimers();
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    jest.spyOn(PerformanceMonitor.prototype, 'subscribe').mockImplementation((callback) => {
      perfCallback = callback;
      return jest.fn();
    });
    jest.spyOn(LongTaskMonitor.prototype, 'subscribe').mockImplementation((callback) => {
      taskCallback = callback;
      return jest.fn();
    });
    jest.spyOn(INPMonitor.prototype, 'subscribe').mockImplementation((callback) => {
      inpCallback = callback;
      return jest.fn();
    });
    jest.spyOn(PerformanceMonitor.prototype, 'isSupported').mockReturnValue(true);
    jest.spyOn(PerformanceMonitor.prototype, 'startMonitoring').mockImplementation();
    jest.spyOn(PerformanceMonitor.prototype, 'stopMonitoring').mockImplementation();
    jest.spyOn(PerformanceMonitor.prototype, 'destroy').mockImplementation();
    jest.spyOn(LongTaskMonitor.prototype, 'startMonitoring').mockImplementation();
    jest.spyOn(LongTaskMonitor.prototype, 'destroy').mockImplementation();
    jest.spyOn(LongTaskMonitor.prototype, 'isSupported').mockReturnValue(true);
    jest.spyOn(INPMonitor.prototype, 'startMonitoring').mockImplementation();
    jest.spyOn(INPMonitor.prototype, 'destroy').mockImplementation();
    jest.spyOn(INPMonitor.prototype, 'isSupported').mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const emit = ({
    perf = neutralPerf,
    task = neutralTask,
    inp = neutralInp,
  }: {
    perf?: PerformanceInfo;
    task?: LongTaskInfo;
    inp?: INPInfo;
  }) => {
    act(() => {
      perfCallback(perf);
      taskCallback(task);
      inpCallback(inp);
    });
  };

  it('keeps the graph full without padding measured statistics', () => {
    render(<FrameJankIndicator />);
    expect(screen.getAllByTestId('performanceGraphBar')).toHaveLength(20);
    expect(screen.getByText('Jank —')).toBeTruthy();

    emit({ perf: { ...neutralPerf, history: [60] } });
    expect(screen.getAllByTestId('performanceGraphBar')).toHaveLength(20);

    fireEvent.focus(screen.getByLabelText('Performance monitor'));
    expect(screen.getByRole('tooltip').textContent).toContain('Samples: 1');
    expect(screen.getByRole('tooltip').textContent).not.toContain('Measuring frame rate…');
  });

  it('selects a danger worst interaction even when p75 and frames are normal', () => {
    render(<FrameJankIndicator />);
    emit({
      inp: {
        ...neutralInp,
        currentINP: 100,
        slowInteractionsCount: 1,
        worstInteractionDelay: 300,
        worstInteractionStartTime: 9_000,
      },
    });

    expect(warningTrigger().getAttribute('aria-label')).toBe(
      'Performance warning: Slow interaction'
    );
    expect(screen.getByText('Jank 0%').getAttribute('data-color')).toBe('danger');
  });

  it('uses deterministic severity then input, stall, blocking, frames precedence', () => {
    render(<FrameJankIndicator />);
    emit({
      perf: { ...neutralPerf, jankPercentage: 15 },
      task: {
        ...neutralTask,
        worstTaskDuration: 100,
        worstTaskStartTime: 8_000,
        totalBlockingTime: 200,
      },
      inp: {
        ...neutralInp,
        slowInteractionsCount: 1,
        worstInteractionDelay: 100,
        worstInteractionStartTime: 9_000,
      },
    });
    expect(warningTrigger().getAttribute('aria-label')).toBe(
      'Performance warning: Slow interaction'
    );
    expect(screen.getByText('Jank 15%').getAttribute('data-color')).toBe('warning');

    act(() => {
      taskCallback({ ...neutralTask, worstTaskDuration: 300, worstTaskStartTime: 8_000 });
    });
    expect(warningTrigger().getAttribute('aria-label')).toBe(
      'Performance warning: Long task'
    );
    expect(screen.getByText('Jank 15%').getAttribute('data-color')).toBe('danger');
  });

  it('falls back to the remaining candidate and then becomes neutral as callbacks expire', () => {
    render(<FrameJankIndicator />);
    emit({
      task: { ...neutralTask, totalBlockingTime: 200 },
      inp: {
        ...neutralInp,
        slowInteractionsCount: 1,
        worstInteractionDelay: 300,
        worstInteractionStartTime: 9_000,
      },
    });

    expect(warningTrigger().getAttribute('aria-label')).toBe(
      'Performance warning: Slow interaction'
    );
    act(() => inpCallback(neutralInp));
    expect(warningTrigger().getAttribute('aria-label')).toBe(
      'Performance warning: Blocking time'
    );
    expect(screen.getByText('Jank 0%').getAttribute('data-color')).toBe('warning');
    fireEvent.focus(warningTrigger());
    const blockingTooltip = screen.getByRole('tooltip').textContent ?? '';
    expect(blockingTooltip.match(/Blocking time:/g)).toHaveLength(1);
    expect(blockingTooltip).not.toContain('Blocking time ·');
    fireEvent.blur(warningTrigger());
    act(() => taskCallback(neutralTask));
    expect(screen.getByLabelText('Performance monitor')).toBeTruthy();
    expect(screen.getByText('Jank 0%').getAttribute('data-color')).toBeNull();
  });

  it('does not select a frame warning before three samples', () => {
    render(<FrameJankIndicator />);
    emit({ perf: { ...neutralPerf, jankPercentage: 100, history: [10, 10] } });

    expect(screen.getByLabelText('Performance monitor')).toBeTruthy();
  });

  it('highlights the selected incident in its metric row', () => {
    render(<FrameJankIndicator />);
    emit({
      inp: {
        ...neutralInp,
        slowInteractionsCount: 1,
        worstInteractionDelay: 100,
        worstInteractionStartTime: 9_000,
      },
    });

    fireEvent.focus(warningTrigger());
    const worst = screen.getByText('Worst: 100ms · 1s ago');
    expect(worst.getAttribute('data-color')).toBe('warning');
    expect(getComputedStyle(worst.parentElement as HTMLElement).fontWeight).toBe('bold');
    expect(screen.getByRole('tooltip').textContent).not.toContain('Slow interaction ·');
  });

  it('shows frame startup and unsupported states without fabricating measurements', () => {
    const { unmount } = render(<FrameJankIndicator />);
    fireEvent.focus(screen.getByLabelText('Performance monitor'));
    expect(screen.getByText('Jank —')).toBeTruthy();
    const measuringTooltip = screen.getByRole('tooltip').textContent ?? '';
    expect(measuringTooltip).toContain('FPS: —');
    expect(measuringTooltip).toContain('Range: —');
    expect(measuringTooltip).toContain('Jank: —');
    expect(measuringTooltip).toContain('Samples: 0');
    expect(measuringTooltip).toContain('Measuring frame rate…');
    expect(measuringTooltip).not.toContain('placeholder');

    act(() => perfCallback(neutralPerf));
    const measuredTooltip = screen.getByRole('tooltip').textContent ?? '';
    expect(measuredTooltip).toContain('FPS: 60');
    expect(measuredTooltip).toContain('Range: 60–60');
    expect(measuredTooltip).toContain('Jank: 0%');
    expect(measuredTooltip).toContain('Samples: 3');
    expect(measuredTooltip).not.toContain('Measuring frame rate…');
    unmount();

    jest.spyOn(PerformanceMonitor.prototype, 'isSupported').mockReturnValue(false);
    render(<FrameJankIndicator />);
    fireEvent.focus(screen.getByLabelText('Performance monitor'));
    expect(screen.getByText('Jank —')).toBeTruthy();
    expect(screen.getByRole('tooltip').textContent).toContain(
      'Frame timing unavailable in this browser.'
    );
    act(() =>
      taskCallback({
        ...neutralTask,
        worstTaskDuration: 600,
        worstTaskStartTime: 9_000,
      })
    );
    expect(warningTrigger().getAttribute('aria-label')).toBe(
      'Performance warning: Long task'
    );
  });

  it('distinguishes unsupported and empty slow-interaction timing', () => {
    jest.spyOn(INPMonitor.prototype, 'isSupported').mockReturnValue(false);
    const { unmount } = render(<FrameJankIndicator />);
    fireEvent.focus(screen.getByLabelText('Performance monitor'));
    expect(screen.getByRole('tooltip').textContent).toContain(
      'Interaction timing unavailable in this browser.'
    );
    expect(screen.getByRole('tooltip').textContent).not.toContain(
      'No interactions ≥100 ms recorded in this window.'
    );
    expect(screen.getByRole('tooltip').textContent).not.toContain('Checking timing support…');
    unmount();

    jest.spyOn(INPMonitor.prototype, 'isSupported').mockReturnValue(true);
    render(<FrameJankIndicator />);
    fireEvent.focus(screen.getByLabelText('Performance monitor'));
    expect(screen.getByRole('tooltip').textContent).toContain('Slow interactions (≥100ms): 0');
    expect(screen.getByRole('tooltip').textContent).not.toContain(
      'No interactions ≥100 ms recorded in this window.'
    );
    expect(screen.getByRole('tooltip').textContent).not.toContain('p75:');
    act(() =>
      inpCallback({
        ...neutralInp,
        currentINP: 120,
        slowInteractionsCount: 1,
        worstInteractionDelay: 120,
        worstInteractionStartTime: 9_000,
      })
    );
    expect(screen.getByRole('tooltip').textContent).toContain('p75: 120ms');
    expect(screen.getByRole('tooltip').textContent).toContain('Worst: 120ms');
  });
  it('updates age only while hovered or focused and clears its timer on inactivity and unmount', () => {
    const { unmount } = render(<FrameJankIndicator />);
    emit({
      inp: {
        ...neutralInp,
        slowInteractionsCount: 1,
        worstInteractionDelay: 100,
        worstInteractionStartTime: 9_000,
      },
    });
    const trigger = warningTrigger();

    fireEvent.mouseEnter(trigger);
    expect(jest.getTimerCount()).toBe(1);
    now = 12_000;
    act(() => jest.advanceTimersByTime(1_000));
    fireEvent.focus(trigger);
    expect(screen.getByRole('tooltip').textContent).toContain('3s ago');

    fireEvent.mouseLeave(trigger);
    expect(jest.getTimerCount()).toBe(1);
    fireEvent.blur(trigger);
    expect(jest.getTimerCount()).toBe(0);

    fireEvent.mouseEnter(trigger);
    expect(jest.getTimerCount()).toBe(1);
    fireEvent.mouseLeave(trigger);
    expect(jest.getTimerCount()).toBe(0);

    fireEvent.focus(trigger);
    expect(jest.getTimerCount()).toBe(1);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
