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

    emit({
      perf: { ...neutralPerf, fps: 0, history: [], maxFps: 0, minFps: 0 },
    });
    expect(screen.getByText('Jank —')).toBeTruthy();

    fireEvent.focus(screen.getByLabelText('Performance monitor'));
    expect(screen.getByRole('tooltip').textContent).toContain('Samples: 0');
    expect(screen.getByRole('tooltip').textContent).toContain('Measuring frame rate…');

    emit({ perf: { ...neutralPerf, history: [60] } });
    expect(screen.getAllByTestId('performanceGraphBar')).toHaveLength(20);

    expect(screen.getByRole('tooltip').textContent).toContain('Samples: 1');
    expect(screen.getByRole('tooltip').textContent).not.toContain('Measuring frame rate…');
  });

  it('selects the worst live warning and ignores frame jank before three samples', () => {
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

    act(() => {
      taskCallback({ ...neutralTask, worstTaskDuration: 300, worstTaskStartTime: 8_000 });
    });
    expect(warningTrigger().getAttribute('aria-label')).toBe('Performance warning: Long task');
    expect(screen.getByText('Jank 15%').getAttribute('data-color')).toBe('danger');

    emit({
      task: { ...neutralTask, totalBlockingTime: 200 },
      inp: {
        ...neutralInp,
        slowInteractionsCount: 1,
        worstInteractionDelay: 300,
        worstInteractionStartTime: 9_000,
      },
    });
    act(() => inpCallback(neutralInp));
    expect(warningTrigger().getAttribute('aria-label')).toBe(
      'Performance warning: Blocking time'
    );
    act(() => taskCallback(neutralTask));
    expect(screen.getByLabelText('Performance monitor')).toBeTruthy();

    emit({ perf: { ...neutralPerf, jankPercentage: 100, history: [10, 10] } });
    expect(screen.getByLabelText('Performance monitor')).toBeTruthy();
  });

  it('keeps other warnings when a timing source is unsupported', () => {
    jest.spyOn(PerformanceMonitor.prototype, 'isSupported').mockReturnValue(false);
    const { unmount } = render(<FrameJankIndicator />);
    act(() =>
      taskCallback({
        ...neutralTask,
        worstTaskDuration: 600,
        worstTaskStartTime: 9_000,
      })
    );
    expect(warningTrigger().getAttribute('aria-label')).toBe('Performance warning: Long task');
    unmount();

    jest.spyOn(PerformanceMonitor.prototype, 'isSupported').mockReturnValue(true);
    jest.spyOn(INPMonitor.prototype, 'isSupported').mockReturnValue(false);
    render(<FrameJankIndicator />);
    fireEvent.focus(screen.getByLabelText('Performance monitor'));
    expect(screen.getByRole('tooltip').textContent).toContain(
      'Interaction timing unavailable in this browser.'
    );
    expect(screen.getByRole('tooltip').textContent).not.toContain('p75:');
  });

  it('updates incident age only while hovered or focused and clears its timer on unmount', () => {
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

    fireEvent.blur(trigger);
    fireEvent.mouseLeave(trigger);
    expect(jest.getTimerCount()).toBe(0);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
