/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WaitRecorder } from './wait_recorder';
import { excludeCaptureGaps, parseFreezeIntervals, summarizeVisualIdle } from './visual_idle';

type Report = ReturnType<WaitRecorder['getReport']>;
const emptySummary = { sleepAndBackoffMs: 0, waitMs: 0, waitOrLookupMs: 0, byCategory: {} };
const createReport = (): Report => ({
  ...emptySummary,
  version: 1,
  config: 'config.ts',
  durationMs: 10000,
  result: 'passed',
  nodeVersion: '24',
  files: ['setup.ts', 'first.ts', 'second.ts'].map((file) => ({
    ...emptySummary,
    file,
    durationMs: 0,
  })),
  runnables: [
    {
      id: 1,
      type: 'hook',
      title: 'setup',
      file: 'setup.ts',
      startMs: 0,
      endMs: 2000,
      result: 'passed',
      durationMs: 2000,
      ...emptySummary,
    },
    {
      id: 2,
      type: 'test',
      title: 'first',
      file: 'first.ts',
      startMs: 2000,
      endMs: 6000,
      result: 'passed',
      durationMs: 4000,
      ...emptySummary,
    },
    {
      id: 3,
      type: 'test',
      title: 'runtime skipped',
      file: 'first.ts',
      startMs: 6000,
      endMs: 7000,
      result: 'skipped',
      durationMs: 1000,
      ...emptySummary,
    },
    {
      id: 4,
      type: 'hook',
      title: 'cleanup',
      file: 'setup.ts',
      startMs: 7000,
      endMs: 8000,
      result: 'passed',
      durationMs: 1000,
      ...emptySummary,
    },
    {
      id: 5,
      type: 'test',
      title: 'second',
      file: 'second.ts',
      startMs: 8000,
      endMs: 10000,
      result: 'passed',
      durationMs: 2000,
      ...emptySummary,
    },
  ],
  waits: [
    {
      category: 'lookup',
      name: 'hook lookup still pending',
      runnableId: 1,
      startMs: 1000,
      endMs: 6000,
      stack: 'setup.ts:1',
      completed: true,
    },
    {
      category: 'lookup',
      name: 'element lookup',
      runnableId: 2,
      startMs: 2300,
      endMs: 4500,
      stack: 'first.ts:1',
      completed: true,
    },
    {
      category: 'webdriverWait',
      name: 'nested wait',
      runnableId: 2,
      startMs: 2400,
      endMs: 4200,
      stack: 'first.ts:2',
      completed: true,
    },
    {
      category: 'sleep',
      name: 'sleep',
      runnableId: 2,
      startMs: 3000,
      endMs: 4000,
      stack: 'first.ts:3',
      completed: true,
    },
    {
      category: 'retry',
      name: 'retry wrapper',
      runnableId: 2,
      startMs: 2000,
      endMs: 6000,
      stack: 'first.ts:4',
      completed: true,
    },
    {
      category: 'lookup',
      name: 'second lookup',
      runnableId: 5,
      startMs: 8500,
      endMs: 9300,
      stack: 'second.ts:1',
      completed: true,
    },
  ],
});

it('parses start/end boundaries and clips a trailing freeze to the recording end', () => {
  const log = `lavfi.freezedetect.freeze_start: 0
lavfi.freezedetect.freeze_duration: 2.5
lavfi.freezedetect.freeze_end: 2.5
lavfi.freezedetect.freeze_start: 4e0`;
  expect(parseFreezeIntervals(log, 6000)).toEqual([
    { startMs: 0, endMs: 2500 },
    { startMs: 4000, endMs: 6000 },
  ]);
});

it('ignores unmatched end boundaries and out-of-range intervals', () => {
  expect(
    parseFreezeIntervals(
      `lavfi.freezedetect.freeze_end: 0.1
lavfi.freezedetect.freeze_start: -0.01
lavfi.freezedetect.freeze_end: 0.2
lavfi.freezedetect.freeze_start: 20`,
      1000
    )
  ).toEqual([{ startMs: 0, endMs: 200 }]);
});

it('subtracts overlapping capture gaps instead of treating missing frames as a freeze', () => {
  expect(
    excludeCaptureGaps(
      [{ startMs: 0, endMs: 10000 }],
      [
        { startMs: 2000, endMs: 3000 },
        { startMs: 2900, endMs: 4000 },
        { startMs: 8000, endMs: 9000 },
      ]
    )
  ).toEqual([
    { startMs: 0, endMs: 2000 },
    { startMs: 4000, endMs: 8000 },
    { startMs: 9000, endMs: 10000 },
  ]);
});

it('unions freezes, clips them to hooks/tests/files, and respects wait ownership', () => {
  const report = summarizeVisualIdle(
    createReport(),
    [
      { startMs: 1000, endMs: 3000 },
      { startMs: 2500, endMs: 5000 },
      { startMs: 8500, endMs: 12000 },
    ],
    []
  );
  expect(report).toMatchObject({
    durationMs: 10000,
    unchangedScreenMs: 5500,
    longestUnchangedMs: 4000,
    waitOverlapMs: 4800,
    sleepAndBackoffOverlapMs: 1000,
  });
  expect(report.unchangedPercent).toBeCloseTo(55);
  expect(report.runnables.map((r) => r.unchangedScreenMs)).toEqual([1000, 3000, 0, 0, 1500]);
  expect(report.runnables[1].waitOverlapMs).toBe(2200);
  expect(report.runnables[2].result).toBe('skipped');
  expect(report.files.find((f) => f.file === 'first.ts')).toMatchObject({
    durationMs: 5000,
    unchangedScreenMs: 3000,
    unchangedPercent: 60,
    waitOverlapMs: 2200,
  });
  expect(report.intervals[0].overlappingWaits.map((w) => w.name)).not.toContain('retry wrapper');
});

it('reports unobserved time separately and never counts it as visual inactivity', () => {
  const report = summarizeVisualIdle(
    createReport(),
    [{ startMs: 0, endMs: 10000 }],
    [{ startMs: 2000, endMs: 6000 }]
  );
  expect(report).toMatchObject({
    unchangedScreenMs: 6000,
    unobservedMs: 4000,
    unchangedPercent: 60,
  });
  expect(report.runnables[1]).toMatchObject({ unchangedScreenMs: 0, unobservedMs: 4000 });
});

it('handles an empty or interrupted recording without invalid percentages', () => {
  const report = createReport();
  report.durationMs = 0;
  report.result = 'interrupted';
  report.runnables = [];
  report.files = [];
  expect(summarizeVisualIdle(report, [], [])).toMatchObject({
    durationMs: 0,
    unchangedPercent: 0,
    longestUnchangedMs: 0,
    testResult: 'interrupted',
  });
});

it('preserves a visible-change boundary between adjacent freezes for longest-interval accounting', () => {
  const intervals = parseFreezeIntervals(
    `lavfi.freezedetect.freeze_start: 0
lavfi.freezedetect.freeze_end: 2
lavfi.freezedetect.freeze_start: 2
lavfi.freezedetect.freeze_end: 3`,
    3000
  );
  expect(intervals).toEqual([
    { startMs: 0, endMs: 2000 },
    { startMs: 2000, endMs: 3000 },
  ]);
  const report = summarizeVisualIdle(createReport(), intervals, []);
  expect(report).toMatchObject({ unchangedScreenMs: 3000, longestUnchangedMs: 2000 });
});
