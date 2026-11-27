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
import { FrameJankIndicator, getPerformanceWarning } from './frame_jank_indicator';

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
  minFps: 60,
};
const neutralTask: LongTaskInfo = {
  worstTaskDuration: 0,
  totalBlockingTime: 0,
  tasksInLast30Seconds: 0,
};
const neutralInp: INPInfo = {
  slowInteractionsCount: 0,
  worstInteractionDelay: 0,
};

const warningTrigger = () => screen.getByLabelText(/^Performance warning:/);

describe('getPerformanceWarning', () => {
  it.each([
    [
      'detects input delay',
      neutralPerf,
      neutralTask,
      { ...neutralInp, worstInteractionDelay: 100 },
      { kind: 'input', severity: 'warning' },
    ],
    [
      'detects a long task',
      neutralPerf,
      { ...neutralTask, worstTaskDuration: 100 },
      neutralInp,
      { kind: 'stall', severity: 'warning' },
    ],
    [
      'detects blocking time',
      neutralPerf,
      { ...neutralTask, totalBlockingTime: 200 },
      neutralInp,
      { kind: 'blocking', severity: 'warning' },
    ],
    [
      'detects frame jank',
      { ...neutralPerf, jankPercentage: 15 },
      neutralTask,
      neutralInp,
      { kind: 'frames', severity: 'warning' },
    ],
    [
      'prefers danger over warning',
      { ...neutralPerf, jankPercentage: 15 },
      { ...neutralTask, worstTaskDuration: 300 },
      { ...neutralInp, worstInteractionDelay: 100 },
      { kind: 'stall', severity: 'danger' },
    ],
    [
      'ignores frame jank before three samples',
      { ...neutralPerf, jankPercentage: 100, history: [10, 10] },
      neutralTask,
      neutralInp,
      null,
    ],
  ])('%s', (_name, perf, task, inp, expected) => {
    expect(getPerformanceWarning(perf, task, inp)).toEqual(expected);
  });
});

describe('FrameJankIndicator warnings', () => {
  let perfCallback: PerfCallback;
  let taskCallback: TaskCallback;
  let inpCallback: InpCallback;

  beforeEach(() => {
    jest.useFakeTimers();
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
      perf: { ...neutralPerf, fps: 0, history: [], minFps: 0 },
    });
    expect(screen.getByText('Jank —')).toBeTruthy();

    fireEvent.focus(screen.getByLabelText('Performance monitor'));
    expect(screen.getByRole('tooltip').textContent).toContain('Frames · 20s');
    expect(screen.getByRole('tooltip').textContent).toContain('Measuring…');
    expect(screen.getByRole('tooltip').textContent).not.toContain('FPS:');

    emit({ perf: { ...neutralPerf, history: [60] } });
    expect(screen.getAllByTestId('performanceGraphBar')).toHaveLength(20);

    expect(screen.getByRole('tooltip').textContent).toContain('FPS: 60 (min 60)');
    expect(screen.getByRole('tooltip').textContent).not.toContain('Measuring…');
  });

  it('keeps other warnings when a timing source is unsupported', () => {
    jest.spyOn(PerformanceMonitor.prototype, 'isSupported').mockReturnValue(false);
    const { unmount } = render(<FrameJankIndicator />);
    act(() =>
      taskCallback({
        ...neutralTask,
        worstTaskDuration: 600,
      })
    );
    expect(warningTrigger().getAttribute('aria-label')).toBe('Performance warning: Long task');
    expect(screen.getByText('Jank —').getAttribute('data-color')).toBe('danger');
    unmount();

    jest.spyOn(PerformanceMonitor.prototype, 'isSupported').mockReturnValue(true);
    jest.spyOn(INPMonitor.prototype, 'isSupported').mockReturnValue(false);
    render(<FrameJankIndicator />);
    fireEvent.focus(screen.getByLabelText('Performance monitor'));
    expect(screen.getByRole('tooltip').textContent).toContain('Not supported in this browser.');
    expect(screen.getByRole('tooltip').textContent).not.toContain('Slowest:');
  });
});
